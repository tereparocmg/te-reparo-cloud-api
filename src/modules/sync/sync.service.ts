import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { Prisma } from '@prisma/client';
import { ALLOWED_TABLES } from '../workshops/workshops.constants';
import type { PushBatchDto, SyncPushEntryDto } from './dto/push-batch.dto';

/**
 * SyncService — bidirectional sync engine between the workshop's
 * local SQLite and the cloud PostgreSQL.
 *
 * Two protocols:
 *  - `pushBatch(workshopId, batch)`  → workshop pushes outgoing changes.
 *  - `pullEvents(workshopId, since)` → workshop pulls incoming SyncEvents.
 *  - `bootstrap(workshopId)`         → workshop fetches its full dataset
 *    on first connect (or after a local data loss).
 *
 * LWW resolution:
 *   Each entry carries `payload.syncVersion` (workshop-local monotonic
 *   counter). Cloud compares it to the existing record's `cloudVersion`;
 *   the change is applied only when `payload.syncVersion > cloudVersion`.
 *
 * SyncEvent.cloudVersion is a single global monotonic counter shared
 * across all SyncEvents (workshop-local and global), so the workshop's
 * pull cursor `sinceCursor` is one number.
 *
 * Realtime (Phase 4):
 *   After creating a SyncEvent, the service calls
 *   `realtimeService.notifyWorkshop(workshopId, {...})` so connected
 *   workshop clients receive a `sync-available` WS event and can pull.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  // ----------------------------------------------------------------
  // PUSH
  // ----------------------------------------------------------------

  /**
   * Apply a batch of changes pushed by a workshop client.
   * Returns `{ processedIds, errors }` so the client can mark
   * each entry as acked or retry it.
   */
  async pushBatch(
    workshopId: string,
    dto: PushBatchDto,
  ): Promise<{
    processedIds: string[];
    errors: { id: string; error: string }[];
  }> {
    const processedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const entry of dto.batch) {
      try {
        await this.applyEntry(workshopId, entry);
        processedIds.push(entry.id);
      } catch (err) {
        const msg = (err as Error).message ?? 'unknown error';
        this.logger.warn(
          `pushBatch entry failed (workshop=${workshopId}, id=${entry.id}, table=${entry.tableName}, record=${entry.recordId}): ${msg}`,
        );
        errors.push({ id: entry.id, error: msg });

        // Persist an audit log entry for the failure so we have a trail.
        await this.audit.log({
          actorId: workshopId,
          actorType: 'WORKSHOP',
          action: `SYNC_PUSH_${entry.operation}_FAILED`,
          tableName: entry.tableName,
          recordId: entry.recordId,
          workshopId,
          errorMessage: msg,
        });
      }
    }

    return { processedIds, errors };
  }

  /**
   * Apply a single batch entry. Validates ownership, applies the
   * operation with LWW, creates a SyncEvent, writes an audit log,
   * and pushes a WS notification.
   */
  private async applyEntry(
    workshopId: string,
    entry: SyncPushEntryDto,
  ): Promise<void> {
    if (!ALLOWED_TABLES.includes(entry.tableName)) {
      throw new BadRequestException(
        `Tabla no sincronizable: ${entry.tableName}`,
      );
    }

    const delegate = (this.prisma as unknown as Record<
      string,
      {
        findUnique: (args: { where: { id: string } }) => Promise<unknown>;
        upsert: (args: {
          where: { id: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => Promise<unknown>;
        update: (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => Promise<unknown>;
        delete: (args: { where: { id: string } }) => Promise<unknown>;
        count: (args?: Record<string, unknown>) => Promise<number>;
      }
    >)[entry.tableName];

    if (!delegate) {
      throw new BadRequestException(
        `Tabla no sincronizable (sin delegate): ${entry.tableName}`,
      );
    }

    const payload = (entry.payload ?? {}) as Record<string, unknown>;
    const incomingVersion =
      typeof payload.syncVersion === 'number' && payload.syncVersion > 0
        ? payload.syncVersion
        : entry.syncVersion ?? 1;

    const existing = (await delegate.findUnique({
      where: { id: entry.recordId },
    })) as
      | (Record<string, unknown> & {
          originWorkshopId?: string | null;
          cloudVersion?: number;
          deletedAt?: Date | null;
        })
      | null;

    // Validate ownership (workshop can only mutate its own records).
    if (existing) {
      const origin =
        existing.originWorkshopId != null
          ? String(existing.originWorkshopId)
          : null;
      if (origin !== null && origin !== workshopId) {
        throw new ForbiddenException(
          `No autorizado para mutar registros de otro taller (table=${entry.tableName}, recordId=${entry.recordId})`,
        );
      }
    } else if (entry.operation !== 'INSERT') {
      throw new NotFoundException(
        `Registro no encontrado para ${entry.operation} (table=${entry.tableName}, recordId=${entry.recordId})`,
      );
    }

    // LWW: skip if the incoming change is stale.
    if (existing && entry.operation !== 'INSERT') {
      const currentCloudVersion =
        typeof existing.cloudVersion === 'number'
          ? existing.cloudVersion
          : 0;
      if (incomingVersion <= currentCloudVersion) {
        this.logger.debug(
          `LWW skip: incoming v${incomingVersion} <= cloud v${currentCloudVersion} (table=${entry.tableName}, record=${entry.recordId})`,
        );
        return; // stale — ignore but don't fail the batch
      }
    }

    // Apply the operation in a transaction so SyncEvent + record stay in sync.
    const nextCloudVersion = await this.nextGlobalCloudVersion();
    const syncEventWorkshopId = await this.deriveSyncEventWorkshopId(
      workshopId,
      entry,
      existing,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        const txDelegate = (tx as unknown as Record<
          string,
          {
            upsert: (args: {
              where: { id: string };
              create: Record<string, unknown>;
              update: Record<string, unknown>;
            }) => Promise<unknown>;
            update: (args: {
              where: { id: string };
              data: Record<string, unknown>;
            }) => Promise<unknown>;
          }
        >)[entry.tableName];

        const data: Record<string, unknown> = {
          ...payload,
          id: entry.recordId,
          cloudVersion: incomingVersion,
          originWorkshopId: workshopId,
          lastSyncedFromWorkshopAt: new Date(),
          deletedAt:
            entry.operation === 'DELETE' ? new Date() : payload.deletedAt ?? null,
        };

        let after: unknown = null;
        if (entry.operation === 'DELETE') {
          if (existing) {
            after = await txDelegate.update({
              where: { id: entry.recordId },
              data: {
                deletedAt: new Date(),
                cloudVersion: incomingVersion,
                lastSyncedFromWorkshopAt: new Date(),
              },
            });
          } else {
            // Nothing to soft-delete; treat as no-op but still emit a SyncEvent.
            after = null;
          }
        } else {
          // INSERT or UPDATE → upsert keeps both code paths identical.
          after = await txDelegate.upsert({
            where: { id: entry.recordId },
            create: data,
            update: {
              ...payload,
              id: entry.recordId,
              cloudVersion: incomingVersion,
              originWorkshopId: workshopId,
              lastSyncedFromWorkshopAt: new Date(),
              deletedAt: null,
            },
          });
        }

        await tx.syncEvent.create({
          data: {
            workshopId: syncEventWorkshopId,
            tableName: entry.tableName,
            recordId: entry.recordId,
            operation: entry.operation,
            payload: (payload as Prisma.InputJsonValue) ?? {},
            cloudVersion: nextCloudVersion,
          },
        });

        // Audit log inside the same tx so failures roll back atomically.
        await tx.auditLog.create({
          data: {
            actorId: workshopId,
            actorType: 'WORKSHOP',
            action: `SYNC_PUSH_${entry.operation}`,
            tableName: entry.tableName,
            recordId: entry.recordId,
            workshopId,
            beforeData: (existing ?? null) as Prisma.InputJsonValue,
            afterData: (after ?? null) as Prisma.InputJsonValue,
          },
        });
      });
    } catch (err) {
      this.rethrowPrismaError(err);
    }

    // Phase 4 — push WS notification so connected clients can pull.
    try {
      this.realtime.notifyWorkshop(workshopId, {
        type: 'sync-available',
        operation: entry.operation,
        tableName: entry.tableName,
        recordId: entry.recordId,
      });
    } catch (err) {
      this.logger.warn(
        `notifyWorkshop failed (non-fatal): ${(err as Error).message}`,
      );
    }
  }

  /**
   * The next value for the global cloudVersion counter (used on the
   * SyncEvent row). Reads the current MAX inside a transaction.
   */
  private async nextGlobalCloudVersion(): Promise<number> {
    const max = await this.prisma.syncEvent.aggregate({
      _max: { cloudVersion: true },
    });
    const current = max._max.cloudVersion ?? 0;
    return current + 1;
  }

  /**
   * Decide whether the SyncEvent should be workshop-local
   * (workshopId set) or global (workshopId null). If the record was
   * originally a global one (originWorkshopId IS NULL), the event is
   * broadcast to all workshops.
   */
  private async deriveSyncEventWorkshopId(
    workshopId: string,
    entry: SyncPushEntryDto,
    existing: { originWorkshopId?: string | null } | null,
  ): Promise<string | null> {
    if (existing && existing.originWorkshopId == null) {
      return null; // global record — broadcast SyncEvent
    }
    const payloadOrigin = (entry.payload ?? {}) as Record<string, unknown>;
    if (
      payloadOrigin.originWorkshopId === null ||
      payloadOrigin.originWorkshopId === undefined
    ) {
      // If the workshop explicitly pushes with originWorkshopId=null,
      // treat as global. Otherwise pin the SyncEvent to the pusher.
      if (payloadOrigin.originWorkshopId === null) return null;
    }
    return workshopId;
  }

  // ----------------------------------------------------------------
  // PULL
  // ----------------------------------------------------------------

  /**
   * Pull pending SyncEvents for the calling workshop, starting after
   * `sinceCursor`. Events whose workshopId is null (global) or matches
   * the caller are returned; events already delivered to the caller
   * (present in `deliveredTo`) are skipped.
   *
   * Side-effect: appends `workshopId` to `deliveredTo` on returned
   * events so they won't be re-delivered on the next pull.
   */
  async pullEvents(
    workshopId: string,
    sinceCursor: number,
    limit = 200,
  ): Promise<{
    events: Array<{
      id: string;
      workshopId: string | null;
      tableName: string;
      recordId: string;
      operation: string;
      payload: unknown;
      cloudVersion: number;
      createdAt: Date;
    }>;
    nextCursor: number;
  }> {
    const take = Math.max(1, Math.min(500, limit));

    const events = await this.prisma.syncEvent.findMany({
      where: {
        cloudVersion: { gt: sinceCursor },
        AND: [
          {
            OR: [
              { workshopId: null },
              { workshopId: workshopId },
            ],
          },
          {
            NOT: { deliveredTo: { has: workshopId } },
          },
        ],
      },
      orderBy: { cloudVersion: 'asc' },
      take,
    });

    if (events.length === 0) {
      return { events: [], nextCursor: sinceCursor };
    }

    // Mark as delivered so the same events won't be re-pulled.
    await Promise.all(
      events.map((ev) =>
        this.prisma.syncEvent.update({
          where: { id: ev.id },
          data: { deliveredTo: { push: workshopId } },
        }),
      ),
    );

    const nextCursor = events[events.length - 1].cloudVersion;
    return {
      events: events.map((ev) => ({
        id: ev.id,
        workshopId: ev.workshopId,
        tableName: ev.tableName,
        recordId: ev.recordId,
        operation: ev.operation,
        payload: ev.payload,
        cloudVersion: ev.cloudVersion,
        createdAt: ev.createdAt,
      })),
      nextCursor,
    };
  }

  // ----------------------------------------------------------------
  // BOOTSTRAP
  // ----------------------------------------------------------------

  /**
   * Initial sync — return all records owned by the calling workshop
   * (originWorkshopId = workshopId) across every syncable table, plus
   * the global records (originWorkshopId IS NULL) of Taller, Usuario
   * and ConfiguracionGlobal.
   *
   * The workshop can use this to seed a fresh local SQLite database.
   */
  async bootstrap(workshopId: string): Promise<Record<string, unknown[]>> {
    const result: Record<string, unknown[]> = {};

    for (const tableName of ALLOWED_TABLES) {
      const delegate = (this.prisma as unknown as Record<
        string,
        {
          findMany: (args: {
            where: Record<string, unknown>;
          }) => Promise<unknown[]>;
        }
      >)[tableName];
      if (!delegate) continue;

      const isGlobalCandidate =
        tableName === 'taller' ||
        tableName === 'usuario' ||
        tableName === 'configuracionGlobal';

      const where = isGlobalCandidate
        ? {
            OR: [
              { originWorkshopId: workshopId },
              { originWorkshopId: null },
            ],
            deletedAt: null,
          }
        : {
            originWorkshopId: workshopId,
            deletedAt: null,
          };

      try {
        result[tableName] = await delegate.findMany({ where });
      } catch (err) {
        this.logger.warn(
          `bootstrap: skipping ${tableName} (${(err as Error).message})`,
        );
        result[tableName] = [];
      }
    }

    return result;
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private rethrowPrismaError(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictException(
          `Conflicto de unicidad: ${err.meta?.target ?? 'recurso'}`,
        );
      }
      if (err.code === 'P2025') {
        throw new NotFoundException('Recurso no encontrado');
      }
      if (err.code === 'P2003') {
        throw new BadRequestException(
          `Violación de integridad referencial: ${err.meta?.field_name ?? ''}`,
        );
      }
    }
    throw err;
  }
}
