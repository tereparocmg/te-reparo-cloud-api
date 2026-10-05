import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { ListQueryDto } from './dto/list-query.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * WorkshopsController — super-admin endpoints under `/api/admin`.
 *
 * All routes are protected by AdminAuthGuard (Bearer JWT of type
 * `'super_admin'`).  The admin can:
 *  - list workshops,
 *  - view a workshop's KPI dashboard,
 *  - list / get / create / update / soft-delete records in any
 *    syncable table on behalf of a workshop.
 *
 * The dynamic `:tableName` path parameter is validated against
 * ALLOWED_TABLES in the service before any Prisma call.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Get('workshops')
  @ApiOperation({ summary: 'Listar todos los talleres' })
  listWorkshops() {
    return this.workshopsService.listWorkshops();
  }

  @Get('workshops/:workshopId/dashboard')
  @ApiOperation({ summary: 'Dashboard de KPIs del taller' })
  dashboard(@Param('workshopId') workshopId: string) {
    return this.workshopsService.getWorkshopDashboard(workshopId);
  }

  @Get('workshops/:workshopId/:tableName')
  @ApiOperation({ summary: 'Listar registros de una tabla del taller' })
  list(
    @Param('workshopId') workshopId: string,
    @Param('tableName') tableName: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query() query?: ListQueryDto,
  ) {
    return this.workshopsService.listWorkshopData(
      workshopId,
      tableName,
      page ?? query?.page ?? 1,
      limit ?? query?.limit ?? 50,
      { includeDeleted: query?.includeDeleted },
    );
  }

  @Get('workshops/:workshopId/:tableName/:recordId')
  @ApiOperation({ summary: 'Obtener un registro por id' })
  get(
    @Param('workshopId') workshopId: string,
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
  ) {
    return this.workshopsService.getWorkshopRecord(
      workshopId,
      tableName,
      recordId,
    );
  }

  @Post('workshops/:workshopId/:tableName')
  @ApiOperation({ summary: 'Crear un registro en una tabla del taller' })
  create(
    @Param('workshopId') workshopId: string,
    @Param('tableName') tableName: string,
    @Body() data: Record<string, unknown>,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const actorId = user?.userId ?? user?.id ?? 'unknown';
    return this.workshopsService.createWorkshopRecord(
      workshopId,
      tableName,
      data,
      String(actorId),
    );
  }

  @Put('workshops/:workshopId/:tableName/:recordId')
  @ApiOperation({ summary: 'Actualizar un registro del taller' })
  update(
    @Param('workshopId') workshopId: string,
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
    @Body() data: Record<string, unknown>,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const actorId = user?.userId ?? user?.id ?? 'unknown';
    return this.workshopsService.updateWorkshopRecord(
      workshopId,
      tableName,
      recordId,
      data,
      String(actorId),
    );
  }

  @Delete('workshops/:workshopId/:tableName/:recordId')
  @ApiOperation({ summary: 'Soft-delete de un registro del taller' })
  remove(
    @Param('workshopId') workshopId: string,
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
    @CurrentUser() user: { id?: string; userId?: string },
  ) {
    const actorId = user?.userId ?? user?.id ?? 'unknown';
    return this.workshopsService.deleteWorkshopRecord(
      workshopId,
      tableName,
      recordId,
      String(actorId),
    );
  }
}
