import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

/**
 * Admin JWT strategy — used by `AdminAuthGuard`.
 *
 * Verifies the Bearer JWT, requires `type === 'super_admin'`, and
 * looks up the actual Usuario row in PostgreSQL to guarantee the
 * account still exists and is active. Returns the user object minus
 * its `password` hash, so the controller can access `req.user.id`,
 * `req.user.email`, `req.user.rol`, etc.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(
  Strategy,
  'admin-jwt',
) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'tereparo-cloud-dev-secret',
    });
  }

  async validate(payload: {
    userId?: string;
    email?: string;
    type?: string;
  }): Promise<unknown> {
    if (!payload.userId) {
      throw new UnauthorizedException('Invalid admin token — no userId');
    }
    const user = await this.authService.validateSuperAdmin(payload);
    if (!user) {
      throw new UnauthorizedException(
        'Admin account not found or inactive',
      );
    }
    return user;
  }
}
