import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (module: string, action: string) => 
  (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, { module, action }, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PERMISSIONS_KEY, { module, action }, target);
  };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<{ module: string; action: string }>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // If no permission required, allow access
    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('未登录');

    // Admin always has access
    if (user.role === 'admin') return true;

    // Check permission in database
    const rows = await this.dataSource.query(
      'SELECT * FROM role_permissions WHERE role = $1 AND module = $2',
      [user.role, permission.module]
    );

    if (!rows.length) throw new ForbiddenException('无权限访问此模块');

    const perm = rows[0];
    const actionMap: Record<string, string> = {
      view: 'can_view',
      create: 'can_create',
      edit: 'can_edit',
      delete: 'can_delete',
    };

    const column = actionMap[permission.action];
    if (!perm[column]) {
      throw new ForbiddenException(`无${permission.action === 'view' ? '查看' : permission.action === 'create' ? '创建' : permission.action === 'edit' ? '编辑' : '删除'}权限`);
    }

    return true;
  }
}
