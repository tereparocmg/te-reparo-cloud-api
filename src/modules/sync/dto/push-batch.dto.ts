import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SyncOperation } from '@prisma/client';

/**
 * One entry in a push batch. The `id` is the client-side correlation
 * id (used by the workshop's outgoing queue); `recordId` is the
 * primary key of the affected row in PostgreSQL.
 */
export class SyncPushEntryDto {
  @IsString()
  id!: string;

  @IsString()
  tableName!: string;

  @IsString()
  recordId!: string;

  @IsEnum(SyncOperation)
  operation!: SyncOperation;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  syncVersion!: number;
}

/**
 * POST /api/sync/push body.
 *
 * The array is capped at 1000 entries per batch to keep transactions
 * bounded; if a workshop needs to push more, it should split batches.
 */
export class PushBatchDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SyncPushEntryDto)
  batch!: SyncPushEntryDto[];
}
