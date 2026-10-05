import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WorkshopJwtStrategy } from './strategies/workshop-jwt.strategy';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

/**
 * AuthModule — wires AuthService + AuthController with two Passport
 * JWT strategies (`workshop-jwt` and `admin-jwt`).
 *
 * JWT secret is read from `JWT_SECRET`; tokens expire after 365d by
 * default (workshop) / 7d (admin access) / 30d (admin refresh).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'tereparo-cloud-dev-secret',
      signOptions: { expiresIn: '365d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WorkshopJwtStrategy, AdminJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
