import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query('page') page: number = 1, @Query('page_size') pageSize: number = 20) {
    return this.usersService.findAll(page, pageSize);
  }

  @Get('permissions')
  @Roles(Role.ADMIN)
  getRolePermissions(@Query('role') role?: string) {
    return this.usersService.getRolePermissions(role);
  }

  @Put('permissions/:role/:module')
  @Roles(Role.ADMIN)
  updateRolePermission(@Param('role') role: string, @Param('module') module: string, @Body() body: any) {
    return this.usersService.updateRolePermission(role, module, body);
  }

  @Get('audit-logs')
  @Roles(Role.ADMIN)
  getAuditLogs(@Query('limit') limit?: number) {
    return this.usersService.getAuditLogs(limit);
  }

  @Get('login-logs')
  @Roles(Role.ADMIN)
  getLoginLogs(@Query('user_id') userId?: number, @Query('limit') limit?: number) {
    return this.usersService.getLoginLogs(userId, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: { username: string; email: string; password: string; display_name?: string; role?: string }, @CurrentUser('id') userId: number) {
    return this.usersService.create(body, userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: number, @Body() body: any, @CurrentUser('id') userId: number) {
    return this.usersService.update(id, body, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: number, @CurrentUser('id') userId: number) {
    return this.usersService.remove(id, userId);
  }
}
