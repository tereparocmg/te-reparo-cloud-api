import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { PushBatchDto } from './dto/push-batch.dto';
import { WorkshopAuthGuard } from '../auth/guards/workshop-auth.guard';
import { CurrentWorkshop } from '../auth/decorators/current-workshop.decorator';

/**
 * SyncController — endpoints under `/api/sync`, all protected by
 * WorkshopAuthGuard (Bearer JWT of type `'workshop'`).
 *
 *  - POST /push       — push a batch of local changes.
 *  - GET  /pull       — pull pending SyncEvents (since cursor).
 *  - GET  /bootstrap  — initial full-table fetch for the workshop.
 */
@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(WorkshopAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @ApiOperation({ summary: 'Push batch of local changes from the workshop' })
  push(
    @CurrentWorkshop() workshopId: string,
    @Body() dto: PushBatchDto,
  ) {
    return this.syncService.pushBatch(workshopId, dto);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Pull pending SyncEvents since cursor' })
  pull(
    @CurrentWorkshop() workshopId: string,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    const sinceCursor = since ? Number.parseInt(since, 10) || 0 : 0;
    const lim = limit ? Number.parseInt(limit, 10) || 200 : 200;
    return this.syncService.pullEvents(workshopId, sinceCursor, lim);
  }

  @Get('bootstrap')
  @ApiOperation({ summary: 'Initial sync — full table dump for the workshop' })
  bootstrap(@CurrentWorkshop() workshopId: string) {
    return this.syncService.bootstrap(workshopId);
  }
}
