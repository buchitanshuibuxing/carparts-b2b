import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('system')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @RequirePermission('settings', 'view')
  async getHealth() {
    return this.systemService.getHealth();
  }

  @Post('restart')
  @RequirePermission('settings', 'edit')
  async restartService() {
    return this.systemService.restartService();
  }

  @Get('logs')
  @RequirePermission('settings', 'view')
  getLogs(
    @Query('type') type: 'out' | 'error' | 'all' = 'all',
    @Query('lines') lines?: string,
  ) {
    const lineCount = lines ? parseInt(lines) : 50;
    return this.systemService.getLogs(type, lineCount);
  }

  @Post('logs/clear')
  @RequirePermission('settings', 'edit')
  clearLogs() {
    return this.systemService.clearLogs();
  }
}
