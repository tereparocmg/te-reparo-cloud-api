import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * RealtimeService — exposes a small façade so other modules (Sync,
 * Workshops) can push notifications to connected workshop / admin
 * clients without depending on Socket.io directly.
 *
 * The `server` reference is injected by RealtimeGateway after Nest
 * boots the WebSocket adapter. Other modules should NOT call this
 * before `onModuleInit` of the gateway runs — but since NestJS
 * guarantees gateway init order during application bootstrap and the
 * consuming controllers are only reachable via HTTP after boot, this
 * is safe in practice.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  /**
   * Reference to the underlying Socket.io server, set by
   * RealtimeGateway via `setServer` once `@WebSocketServer()` has
   * been populated. Using a setter avoids any DI cycle between
   * RealtimeGateway ↔ RealtimeService.
   */
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('Socket.io server reference bound');
  }

  /**
   * Push an event to all clients connected on behalf of a single
   * workshop. The event name is `sync-available`.
   */
  notifyWorkshop(workshopId: string, event: unknown): void {
    if (!this.server) {
      this.logger.warn(
        `notifyWorkshop ignored — server not bound (workshopId=${workshopId})`,
      );
      return;
    }
    this.server.to(`workshop:${workshopId}`).emit('sync-available', event);
  }

  /**
   * Broadcast an event to every connected client.
   */
  notifyAllWorkshops(event: unknown): void {
    if (!this.server) {
      this.logger.warn('notifyAllWorkshops ignored — server not bound');
      return;
    }
    this.server.emit('sync-available', event);
  }

  /**
   * Push an admin-only notification to all connected admin clients.
   * Event name is `admin-notification`.
   */
  notifyAdmin(event: unknown): void {
    if (!this.server) {
      this.logger.warn('notifyAdmin ignored — server not bound');
      return;
    }
    this.server.to('admin').emit('admin-notification', event);
  }
}
