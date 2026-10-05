import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * POST /api/auth/login-admin
 * Body used by super-admin to log into the cloud console.
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
