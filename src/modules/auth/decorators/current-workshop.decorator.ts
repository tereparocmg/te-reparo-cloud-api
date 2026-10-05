import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * `@CurrentWorkshop()` — extracts `req.user.workshopId` for routes
 * protected by WorkshopAuthGuard.
 *
 * Usage:
 *   @Post('push')
 *   @UseGuards(WorkshopAuthGuard)
 *   push(@CurrentWorkshop() workshopId: string, ...) {}
 */
export const CurrentWorkshop = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.workshopId ?? null;
  },
);
