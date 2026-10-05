import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterWorkshopDto } from './dto/register-workshop.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';

/**
 * AuthService — issues JWT tokens for two kinds of principals:
 *  1. Workshops (register via `POST /api/auth/register-workshop` and
 *     authenticate using a long-lived `apiToken` JWT to sync data).
 *  2. Super admins (login via `POST /api/auth/login-admin` using email +
 *     bcrypt-validated password; get a short-lived access token + a
 *     30-day refresh token).
 *
 * The Prisma model `Usuario.password` stores a bcrypt hash; never return
 * it in any response. The Workshop model stores `apiTokenHash` (bcrypt
 * hash of the JWT issued at registration) so we can validate a token
 * against the cloud DB without keeping the raw JWT around.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ----------------------------------------------------------------
  // Workshop registration
  // ----------------------------------------------------------------

  /**
   * Create a new Workshop, generate a 1-year JWT and store its bcrypt
   * hash as `apiTokenHash`. Returns `{ workshop, apiToken }`.
   */
  async registerWorkshop(dto: RegisterWorkshopDto): Promise<{
    workshop: Record<string, unknown>;
    apiToken: string;
  }> {
    const workshopId = randomUUID();
    const apiToken = await this.jwtService.signAsync(
      { workshopId, type: 'workshop' },
      { expiresIn: '365d' },
    );
    const apiTokenHash = await bcrypt.hash(apiToken, 10);

    try {
      const workshop = await this.prisma.workshop.create({
        data: {
          id: workshopId,
          name: dto.name,
          address: dto.address ?? null,
          phone: dto.phone ?? null,
          apiTokenHash,
          lastSeenAt: new Date(),
        },
      });

      // Strip the hash before returning.
      const { apiTokenHash: _hash, ...safeWorkshop } = workshop;
      return {
        workshop: safeWorkshop as Record<string, unknown>,
        apiToken,
      };
    } catch (err) {
      this.handlePrismaError(err, 'registerWorkshop');
      throw err; // unreachable — handlePrismaError always throws
    }
  }

  // ----------------------------------------------------------------
  // Super-admin login
  // ----------------------------------------------------------------

  /**
   * Validate email + bcrypt-hashed password and return short-lived
   * access + refresh tokens.
   */
  async loginSuperAdmin(dto: LoginDto): Promise<{
    user: Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
  }> {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.activo || user.deletedAt) {
      throw new UnauthorizedException('Cuenta inactiva');
    }
    if (user.rol !== 'SUPER_ADMIN') {
      throw new UnauthorizedException(
        'Esta cuenta no tiene privilegios de super admin',
      );
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync(
      { userId: user.id, email: user.email, type: 'super_admin' },
      { expiresIn: '7d' },
    );
    const refreshToken = await this.jwtService.signAsync(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '30d' },
    );

    const { password: _pw, ...safeUser } = user;
    return {
      user: safeUser as Record<string, unknown>,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify a refresh token and return a fresh access token.
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: string;
        type: string;
      }>(token);
      if (payload.type !== 'refresh' || !payload.userId) {
        throw new UnauthorizedException('Refresh token inválido');
      }
      const user = await this.prisma.usuario.findUnique({
        where: { id: payload.userId },
      });
      if (!user || !user.activo || user.deletedAt) {
        throw new UnauthorizedException('Cuenta inactiva o inexistente');
      }
      const accessToken = await this.jwtService.signAsync(
        { userId: user.id, email: user.email, type: 'super_admin' },
        { expiresIn: '7d' },
      );
      return { accessToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(
        `Refresh token inválido: ${(err as Error).message}`,
      );
    }
  }

  // ----------------------------------------------------------------
  // Strategy helpers — called by WorkshopJwtStrategy / AdminJwtStrategy
  // ----------------------------------------------------------------

  /**
   * Validate a workshop JWT payload — returns it if `type === 'workshop'`.
   */
  validateWorkshop(payload: {
    workshopId?: string;
    type?: string;
  }): { workshopId?: string; type?: string } | null {
    if (payload.type !== 'workshop' || !payload.workshopId) {
      return null;
    }
    return payload;
  }

  /**
   * Validate a super-admin JWT payload — looks up the Usuario row and
   * returns it (without passwordHash) when active.
   */
  async validateSuperAdmin(payload: {
    userId?: string;
    email?: string;
    type?: string;
  }): Promise<Record<string, unknown> | null> {
    if (payload.type !== 'super_admin' || !payload.userId) {
      return null;
    }
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.activo || user.deletedAt) {
      return null;
    }
    const { password: _pw, ...safeUser } = user;
    return safeUser as Record<string, unknown>;
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private handlePrismaError(err: unknown, ctx: string): never {
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
        throw new ConflictException(
          `Violación de integridad referencial (${ctx})`,
        );
      }
    }
    this.logger.error(`[${ctx}] Prisma error: ${(err as Error).message}`);
    throw err;
  }
}
