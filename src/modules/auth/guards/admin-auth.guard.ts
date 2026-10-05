import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * AdminAuthGuard — protects routes used by the super admin
 * (workshop provisioning, dashboards, generic CRUD on workshop data).
 * Requires a Bearer JWT of type `'super_admin'`; populates `req.user`
 * with the Usuario row (without password hash).
 */
@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {}
