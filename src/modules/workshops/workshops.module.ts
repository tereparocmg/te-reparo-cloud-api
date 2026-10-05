import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { WorkshopsService } from './workshops.service';
import { WorkshopsController } from './workshops.controller';

/**
 * WorkshopsModule — super-admin CRUD over workshops and their data.
 *
 * Depends on:
 *  - PrismaModule (@Global, listed for clarity)
 *  - AuditModule (@Global, listed for clarity)
 *  - RealtimeModule (RealtimeService — emits sync-available WS events
 *    after each create/update/delete so the workshop pulls)
 *  - AuthModule (provides AdminAuthGuard + AdminJwtStrategy)
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    RealtimeModule,
    AuthModule,
  ],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
})
export class WorkshopsModule {}
