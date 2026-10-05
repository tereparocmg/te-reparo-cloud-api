import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

/**
 * Workshop JWT strategy — used by `WorkshopAuthGuard`.
 *
 * Verifies that the Bearer JWT was signed with the cloud secret and
 * that its `type` claim is `'workshop'`. On success, returns the
 * verified payload (containing `workshopId`) so controllers can
 * access `req.user.workshopId`.
 */
@Injectable()
export class WorkshopJwtStrategy extends PassportStrategy(
  Strategy,
  'workshop-jwt',
) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'tereparo-cloud-dev-secret',
    });
  }

  async validate(payload: {
    workshopId?: string;
    type?: string;
  }): Promise<{ workshopId: string; type: string }> {
    const validated = this.authService.validateWorkshop(payload);
    if (!validated) {
      throw new UnauthorizedException('Invalid workshop token');
    }
    return { workshopId: validated.workshopId!, type: validated.type! };
  }
}
