import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterWorkshopDto } from './dto/register-workshop.dto';
import { LoginDto } from './dto/login.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

/**
 * AuthController — exposes authentication endpoints under `/api/auth`.
 *
 * All routes are public except `GET /me` which requires an admin JWT.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-workshop')
  @ApiOperation({ summary: 'Provisionar un nuevo taller (devuelve apiToken)' })
  registerWorkshop(@Body() dto: RegisterWorkshopDto) {
    return this.authService.registerWorkshop(dto);
  }

  @Post('login-admin')
  @ApiOperation({ summary: 'Login super-admin (email + password)' })
  loginAdmin(@Body() dto: LoginDto) {
    return this.authService.loginSuperAdmin(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve el usuario autenticado (super admin)' })
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
