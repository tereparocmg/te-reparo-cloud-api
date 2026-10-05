import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * List-query DTO shared across all `GET /api/admin/workshops/:id/:table`
 * endpoints. Mirrors pagination + soft-delete visibility.
 *
 * Note: `tableName` and `workshopId` arrive as URL params, not via
 * the body, so they aren't part of this DTO — but we keep a stub
 * for symmetry with future listing endpoints.
 */
export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
