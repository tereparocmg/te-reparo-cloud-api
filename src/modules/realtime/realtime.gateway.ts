import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import {
  OnModuleInit,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

/**
 * RealtimeGateway — Phase 4 WebSocket layer.
 *
 * Clients connect to the default namespace `/` and authenticate by
 * sending a Bearer JWT either via `auth.token` (recommended by
 * socket.io) or via the `authorization` header.
 *
 * On successful auth:
 *  - workshop JWT (type === 'workshop')  → joins `workshop:<workshopId>`.
 *  - admin JWT   (type === 'super_admin') → joins `admin`.
 *
 * Otherwise the socket is disconnected.
 */
@WebSocketGateway({
  cors: true,
  namespace: '/',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  onModuleInit(): void {
    // Server is injected by Nest before this runs; sanity-check.
    if (!this.server) {
      this.logger.warn('Socket.io server reference is null on init');
    }
  }

  /**
   * Extract the JWT from either `handshake.auth.token` or the
   * `Authorization: Bearer <jwt>` header. Returns `null` if absent.
   */
  private extractToken(client: Socket): string | null {
    const authAny = (client.handshake as unknown as { auth?: unknown }).auth;
    if (authAny && typeof authAny === 'object') {
      const token = (authAny as Record<string, unknown>).token;
      if (typeof token === 'string' && token.length > 0) {
        return token;
      }
    }
    const headers = client.handshake.headers || {};
    const raw = headers['authorization'] || headers['Authorization'];
    if (typeof raw === 'string' && raw.toLowerCase().startsWith('bearer ')) {
      return raw.slice(7).trim();
    }
    return null;
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection refused — no token (id=${client.id})`);
        client.disconnect(true);
        return;
      }

      let payload: {
        workshopId?: string;
        userId?: string;
        type?: string;
      };
      try {
        payload = this.jwtService.verify(token);
      } catch (err) {
        this.logger.warn(
          `Connection refused — invalid token (id=${client.id}): ${(err as Error).message}`,
        );
        client.disconnect(true);
        return;
      }

      if (payload.type === 'workshop' && payload.workshopId) {
        const room = `workshop:${payload.workshopId}`;
        await client.join(room);
        (client.data as { workshopId?: string }).workshopId =
          payload.workshopId;
        this.logger.log(
          `Workshop client connected id=${client.id} → room=${room}`,
        );
        client.emit('connected', { room, type: 'workshop' });
        return;
      }

      if (payload.type === 'super_admin') {
        await client.join('admin');
        (client.data as { userId?: string }).userId = payload.userId;
        this.logger.log(`Admin client connected id=${client.id} → room=admin`);
        client.emit('connected', { room: 'admin', type: 'super_admin' });
        return;
      }

      this.logger.warn(
        `Connection refused — unknown token type (id=${client.id}, type=${payload.type})`,
      );
      client.disconnect(true);
    } catch (err) {
      this.logger.error(
        `Unexpected error during connection (id=${client.id}): ${(err as Error).message}`,
      );
      client.disconnect(true);
      throw new UnauthorizedException('WebSocket authentication failed');
    }
  }

  handleDisconnect(client: Socket): void {
    const data = (client.data || {}) as { workshopId?: string; userId?: string };
    this.logger.log(
      `Client disconnected id=${client.id} (workshop=${data.workshopId ?? '-'}, user=${data.userId ?? '-'})`,
    );
  }
}
