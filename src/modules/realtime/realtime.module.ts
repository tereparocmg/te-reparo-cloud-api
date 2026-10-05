import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

/**
 * RealtimeModule — Phase 4 WebSocket layer for Te Reparo Cloud API.
 *
 * Provides:
 *  - `RealtimeGateway` (socket.io connection + JWT auth)
 *  - `RealtimeService`  (façade for other modules to emit events)
 *
 * Exports `RealtimeService` so SyncModule / WorkshopsModule can inject
 * it and notify connected clients right after a SyncEvent is created.
 *
 * JwtModule is registered locally with the same secret used by AuthModule
 * so the gateway can verify Bearer tokens passed via `handshake.auth`.
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'tereparo-cloud-dev-secret',
      signOptions: { expiresIn: '365d' },
    }),
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule implements OnModuleInit {
  private readonly logger = new Logger(RealtimeModule.name);

  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly service: RealtimeService,
  ) {}

  /**
   * Bridge the `@WebSocketServer()` reference from the gateway into
   * RealtimeService so the service can emit. We do this in
   * `onModuleInit` because NestJS populates `@WebSocketServer()` only
   * after the IoAdapter is wired (during bootstrap), but before the
   * `onModuleInit` lifecycle hook fires for app modules — in practice
   * we may need to retry on the first HTTP request. To be safe we
   * also expose a `setServer` setter on the service.
   */
  onModuleInit(): void {
    if ((this.gateway as unknown as { server?: unknown }).server) {
      this.service.setServer(
        (this.gateway as unknown as { server: import('socket.io').Server })
          .server,
      );
    } else {
      // Defer binding until first gateway lifecycle tick.
      setImmediate(() => {
        const ref = (this.gateway as unknown as { server?: import('socket.io').Server }).server;
        if (ref) {
          this.service.setServer(ref);
        } else {
          this.logger.warn(
            'Socket.io server still null after onModuleInit — WS notifications will be ignored until a server ref is set',
          );
        }
      });
    }
  }
}
