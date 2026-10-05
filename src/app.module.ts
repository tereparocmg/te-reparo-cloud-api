import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    SyncModule,
    WorkshopsModule,
    RealtimeModule,
  ],
})
export class AppModule {}
