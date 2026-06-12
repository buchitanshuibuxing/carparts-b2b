import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get()
  @RequirePermission('settings', 'view')
  getAll() { return this.svc.getAll(); }
  @Put(':key') @Roles(Role.ADMIN) update(@Param('key') key: string, @Body() body: { value: string }) { return this.svc.update(key, body.value); }
  @Post('test-connection/:type') @Roles(Role.ADMIN) testConnection(@Param('type') type: string) { return this.svc.testConnection(type); }
}
