import { IsOptional, IsString } from 'class-validator';

/**
 * POST /api/auth/register-workshop
 * Body used by a workshop client to provision a new cloud account.
 * `name` is required; address & phone are optional.
 */
export class RegisterWorkshopDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
