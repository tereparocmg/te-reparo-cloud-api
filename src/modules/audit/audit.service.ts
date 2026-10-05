import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActorType } from '@prisma/client';

export interface AuditLogInput {
  actorId: string;
  actorType: ActorType;
  action: string;
  tableName: string;
  recordId?: string | null;
  workshopId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  errorMessage?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist an audit log entry. Never throws — audit failures must not
   * break the request flow. They are logged as a warning instead.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          actorType: input.actorType,
          action: input.action,
          tableName: input.tableName,
          recordId: input.recordId ?? null,
          workshopId: input.workshopId ?? null,
          beforeData: (input.beforeData ?? null) as never,
          afterData: (input.afterData ?? null) as never,
          errorMessage: input.errorMessage ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist audit log (action=${input.action} table=${input.tableName}): ${(err as Error).message}`,
      );
    }
  }
}
