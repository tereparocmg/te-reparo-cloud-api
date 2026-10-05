import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * WorkshopAuthGuard — protects routes that act on behalf of a single
 * workshop (sync push/pull/bootstrap, etc.).
 * Requires a Bearer JWT of type `'workshop'`; populates `req.user`
 * with `{ workshopId, type }`.
 */
@Injectable()
export class WorkshopAuthGuard extends AuthGuard('workshop-jwt') {}
