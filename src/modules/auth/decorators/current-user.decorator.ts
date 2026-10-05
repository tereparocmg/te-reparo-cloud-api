import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * `@CurrentUser()` — extracts `req.user` set by an auth guard.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(AdminAuthGuard)
 *   me(@CurrentUser() user: any) { return user; }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user ?? null;
  },
);
