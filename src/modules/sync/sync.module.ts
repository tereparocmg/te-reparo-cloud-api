import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

/**
 * SyncModule — wires the bidirectional sync engine.
 *
 * Depends on:
 *  - PrismaModule    (PrismaService is @Global — explicit for clarity)
 *  - AuditModule     (AuditService — also @Global)
 *  - AuthModule      (provides WorkshopAuthGuard strategies via AuthModule
 *                     exporting Passport strategies implicitly through
 *                     the registered strategies — see AuthModule)
 *  - RealtimeModule  (RealtimeService — to emit WS notifications)
 *
 * Note: PrismaModule + AuditModule are @Global so importing them is
 * only for documentation; AuthModule exports AuthService and
 * JwtModule registers the JWT secret used to verify workshop tokens
 * in WorkshopJwtStrategy.
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    RealtimeModule,
    AuthModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
