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
import { isAllowedTable } from './workshops.constants';

/**
 * WorkshopsService — admin-side CRUD operations over a workshop's
 * data.  Used by the cloud console (super admin) to manage workshops,
 * view KPIs, and create / update / delete records in any syncable
 * table on behalf of a workshop.
 *
 * Every mutation:
 *   - validates the table name against ALLOWED_TABLES,
 *   - writes a SyncEvent (so the affected workshop can pull),
 *   - writes an AuditLog (actorType = SUPER_ADMIN),
 *   - notifies the workshop via WebSocket (Phase 4).
 */
@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  // ----------------------------------------------------------------
  // Workshop listing & dashboard
  // ----------------------------------------------------------------

  /**
   * List all workshops.  `apiTokenHash` is never exposed.
   */
  async listWorkshops() {
    const workshops = await this.prisma.workshop.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return workshops.map(({ apiTokenHash: _h, ...rest }) => rest);
  }

  /**
   * KPIs for the super-admin dashboard of a single workshop.
   * Returns counts of the main transactional tables plus today's
   * cash summary (ingresos / gastos / balance).
   */
  async getWorkshopDashboard(workshopId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });
    if (!workshop) {
      throw new NotFoundException(`Taller no encontrado: ${workshopId}`);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      ventasCount,
      serviciosCount,
      productosCount,
      piezasCount,
      clientesCount,
      movimientosCount,
      todayIngresos,
      todayGastos,
    ] = await Promise.all([
      this.prisma.venta.count({ where: { originWorkshopId: workshopId } }),
      this.prisma.servicio.count({ where: { originWorkshopId: workshopId } }),
      this.prisma.producto.count({ where: { originWorkshopId: workshopId } }),
      this.prisma.pieza.count({ where: { originWorkshopId: workshopId } }),
      this.prisma.cliente.count({ where: { originWorkshopId: workshopId } }),
      this.prisma.movimiento.count({
        where: { originWorkshopId: workshopId },
      }),
      this.prisma.movimiento.aggregate({
        _sum: { monto: true },
        where: {
          originWorkshopId: workshopId,
          tipo: 'INGRESO',
          fecha: { gte: startOfToday, lte: endOfToday },
        },
      }),
      this.prisma.movimiento.aggregate({
        _sum: { monto: true },
        where: {
          originWorkshopId: workshopId,
          tipo: 'GASTO',
          fecha: { gte: startOfToday, lte: endOfToday },
        },
      }),
    ]);

    const ingresos = todayIngresos._sum.monto ?? 0;
    const gastos = todayGastos._sum.monto ?? 0;

    return {
      workshop: {
        id: workshop.id,
        name: workshop.name,
        isActive: workshop.isActive,
        lastSeenAt: workshop.lastSeenAt,
        cloudVersion: workshop.cloudVersion,
      },
      kpis: {
        ventas: ventasCount,
        servicios: serviciosCount,
        productos: productosCount,
        piezas: piezasCount,
        clientes: clientesCount,
        movimientos: movimientosCount,
        todayIngresos: ingresos,
        todayGastos: gastos,
        todayBalance: ingresos - gastos,
      },
    };
  }

  // ----------------------------------------------------------------
  // Generic CRUD over a workshop's data
  // ----------------------------------------------------------------

  /**
   * Generic list of records in `tableName` belonging to `workshopId`,
   * paginated.  Soft-deleted rows are filtered out unless the caller
   * passes `includeDeleted: true`.
   */
  async listWorkshopData(
    workshopId: string,
    tableName: string,
    page = 1,
    limit = 50,
    opts: { includeDeleted?: boolean } = {},
  ): Promise<{
    data: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!isAllowedTable(tableName)) {
      throw new BadRequestException(`Tabla no permitida: ${tableName}`);
    }
    const delegate = this.getDelegate(tableName);
    const take = Math.max(1, Math.min(500, limit));
    const skip = Math.max(0, (page - 1) * take);

    const where: Record<string, unknown> = {
      originWorkshopId: workshopId,
    };
    if (!opts.includeDeleted) {
      where.deletedAt = null;
    }

    const [data, total] = await Promise.all([
      delegate.findMany({ where, skip, take, orderBy: { id: 'asc' } as never }),
      delegate.count({ where }),
    ]);

    return { data, total, page, limit: take };
  }

  /**
   * Fetch a single record by id, scoped to the workshop. Returns 404
   * if the row doesn't exist or belongs to another workshop.
   */
  async getWorkshopRecord(
    workshopId: string,
    tableName: string,
    recordId: string,
  ): Promise<unknown> {
    if (!isAllowedTable(tableName)) {
      throw new BadRequestException(`Tabla no permitida: ${tableName}`);
    }
    const delegate = this.getDelegate(tableName);
    const record = (await delegate.findUnique({
      where: { id: recordId },
    })) as (Record<string, unknown> & {
      originWorkshopId?: string | null;
    }) | null;
    if (!record) {
      throw new NotFoundException(
        `Registro no encontrado (table=${tableName}, id=${recordId})`,
      );
    }
    if (record.originWorkshopId && record.originWorkshopId !== workshopId) {
      throw new ForbiddenException(
        `El registro pertenece a otro taller (table=${tableName}, id=${recordId})`,
      );
    }
    return record;
  }

  /**
   * Super-admin creates a record on behalf of a workshop.
   * `originWorkshopId` is set to the workshop (so they own it),
   * `cloudVersion` starts at 1, and a SyncEvent is emitted so the
   * workshop pulls it on its next sync.
   */
  async createWorkshopRecord(
    workshopId: string,
    tableName: string,
    data: Record<string, unknown>,
    userId: string,
  ): Promise<unknown> {
    if (!isAllowedTable(tableName)) {
      throw new BadRequestException(`Tabla no permitida: ${tableName}`);
    }
    const delegate = this.getDelegate(tableName);

    const nextCloudVersion = await this.nextGlobalCloudVersion();

    const createData: Record<string, unknown> = {
      ...data,
      originWorkshopId: workshopId,
      cloudVersion: 1,
      lastSyncedFromWorkshopAt: new Date(),
      deletedAt: null,
    };

    let record: unknown;
    try {
      record = await delegate.create({ data: createData as never });
    } catch (err) {
      this.rethrowPrismaError(err, `createWorkshopRecord/${tableName}`);
      throw err; // unreachable
    }

    await this.prisma.syncEvent.create({
      data: {
        workshopId,
        tableName,
        recordId: String((createData as { id?: string }).id ?? ''),
        operation: 'INSERT',
        payload: (createData as Prisma.InputJsonValue) ?? {},
        cloudVersion: nextCloudVersion,
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'SUPER_ADMIN',
      action: 'ADMIN_CREATE_RECORD',
      tableName,
      recordId: String((createData as { id?: string }).id ?? ''),
      workshopId,
      afterData: record as unknown,
    });

    this.realtime.notifyWorkshop(workshopId, {
      type: 'sync-available',
      tableName,
      recordId: String((createData as { id?: string }).id ?? ''),
      operation: 'INSERT',
    });

    return record;
  }

  /**
   * Update a workshop record on behalf of the super admin. Fetches
   * the existing row (for the audit before-snapshot), applies the
   * patch, increments `cloudVersion`, and emits an UPDATE SyncEvent.
   */
  async updateWorkshopRecord(
    workshopId: string,
    tableName: string,
    recordId: string,
    data: Record<string, unknown>,
    userId: string,
  ): Promise<unknown> {
    if (!isAllowedTable(tableName)) {
      throw new BadRequestException(`Tabla no permitida: ${tableName}`);
    }
    const delegate = this.getDelegate(tableName);

    const existing = (await delegate.findUnique({
      where: { id: recordId },
    })) as (Record<string, unknown> & {
      originWorkshopId?: string | null;
      cloudVersion?: number;
    }) | null;

    if (!existing) {
      throw new NotFoundException(
        `Registro no encontrado (table=${tableName}, id=${recordId})`,
      );
    }
    if (existing.originWorkshopId && existing.originWorkshopId !== workshopId) {
      throw new ForbiddenException(
        `El registro pertenece a otro taller (table=${tableName}, id=${recordId})`,
      );
    }

    const currentCloudVersion =
      typeof existing.cloudVersion === 'number' ? existing.cloudVersion : 0;
    const nextCloudVersion = currentCloudVersion + 1;
    const nextSyncEventCloudVersion = await this.nextGlobalCloudVersion();

    const updateData: Record<string, unknown> = {
      ...data,
      id: recordId,
      cloudVersion: nextCloudVersion,
      lastSyncedFromWorkshopAt: new Date(),
    };

    let updated: unknown;
    try {
      updated = await delegate.update({
        where: { id: recordId },
        data: updateData as never,
      });
    } catch (err) {
      this.rethrowPrismaError(err, `updateWorkshopRecord/${tableName}`);
      throw err; // unreachable
    }

    await this.prisma.syncEvent.create({
      data: {
        workshopId,
        tableName,
        recordId,
        operation: 'UPDATE',
        payload: (updateData as Prisma.InputJsonValue) ?? {},
        cloudVersion: nextSyncEventCloudVersion,
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'SUPER_ADMIN',
      action: 'ADMIN_UPDATE_RECORD',
      tableName,
      recordId,
      workshopId,
      beforeData: existing as unknown,
      afterData: updated as unknown,
    });

    this.realtime.notifyWorkshop(workshopId, {
      type: 'sync-available',
      tableName,
      recordId,
      operation: 'UPDATE',
    });

    return updated;
  }

  /**
   * Soft-delete a record on behalf of the super admin.  Sets
   * `deletedAt = now()`, increments `cloudVersion`, and emits a
   * DELETE SyncEvent.
   */
  async deleteWorkshopRecord(
    workshopId: string,
    tableName: string,
    recordId: string,
    userId: string,
  ): Promise<{ id: string; deletedAt: Date; cloudVersion: number }> {
    if (!isAllowedTable(tableName)) {
      throw new BadRequestException(`Tabla no permitida: ${tableName}`);
    }
    const delegate = this.getDelegate(tableName);

    const existing = (await delegate.findUnique({
      where: { id: recordId },
    })) as (Record<string, unknown> & {
      originWorkshopId?: string | null;
      cloudVersion?: number;
      deletedAt?: Date | null;
    }) | null;

    if (!existing) {
      throw new NotFoundException(
        `Registro no encontrado (table=${tableName}, id=${recordId})`,
      );
    }
    if (existing.originWorkshopId && existing.originWorkshopId !== workshopId) {
      throw new ForbiddenException(
        `El registro pertenece a otro taller (table=${tableName}, id=${recordId})`,
      );
    }

    const currentCloudVersion =
      typeof existing.cloudVersion === 'number' ? existing.cloudVersion : 0;
    const nextCloudVersion = currentCloudVersion + 1;
    const nextSyncEventCloudVersion = await this.nextGlobalCloudVersion();

    const now = new Date();
    const updateData: Record<string, unknown> = {
      deletedAt: now,
      cloudVersion: nextCloudVersion,
      lastSyncedFromWorkshopAt: now,
    };

    try {
      await delegate.update({
        where: { id: recordId },
        data: updateData as never,
      });
    } catch (err) {
      this.rethrowPrismaError(err, `deleteWorkshopRecord/${tableName}`);
      throw err; // unreachable
    }

    await this.prisma.syncEvent.create({
      data: {
        workshopId,
        tableName,
        recordId,
        operation: 'DELETE',
        payload: (updateData as Prisma.InputJsonValue) ?? {},
        cloudVersion: nextSyncEventCloudVersion,
      },
    });

    await this.audit.log({
      actorId: userId,
      actorType: 'SUPER_ADMIN',
      action: 'ADMIN_DELETE_RECORD',
      tableName,
      recordId,
      workshopId,
      beforeData: existing as unknown,
    });

    this.realtime.notifyWorkshop(workshopId, {
      type: 'sync-available',
      tableName,
      recordId,
      operation: 'DELETE',
    });

    return { id: recordId, deletedAt: now, cloudVersion: nextCloudVersion };
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  /**
   * Access the Prisma delegate by table name. We cast loosely because
   * Prisma's typing for `prisma.$methods` doesn't expose a generic
   * "any delegate" interface.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getDelegate(tableName: string): any {
    const delegate = (this.prisma as unknown as Record<string, unknown>)[
      tableName
    ];
    if (!delegate || typeof delegate !== 'object') {
      throw new BadRequestException(
        `Tabla no sincronizable (sin delegate Prisma): ${tableName}`,
      );
    }
    return delegate;
  }

  /**
   * Next value for the SyncEvent.cloudVersion global counter.
   */
  private async nextGlobalCloudVersion(): Promise<number> {
    const max = await this.prisma.syncEvent.aggregate({
      _max: { cloudVersion: true },
    });
    return (max._max.cloudVersion ?? 0) + 1;
  }

  private rethrowPrismaError(err: unknown, ctx: string): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new ConflictException(
          `Conflicto de unicidad (${ctx}): ${err.meta?.target ?? 'recurso'}`,
        );
      }
      if (err.code === 'P2025') {
        throw new NotFoundException(`Recurso no encontrado (${ctx})`);
      }
      if (err.code === 'P2003') {
        throw new BadRequestException(
          `Violación de integridad referencial (${ctx}): ${err.meta?.field_name ?? ''}`,
        );
      }
    }
    this.logger.error(`[${ctx}] Prisma error: ${(err as Error).message}`);
    throw err;
  }
}
