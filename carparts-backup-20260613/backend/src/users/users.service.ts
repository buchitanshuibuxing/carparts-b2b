import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginLog } from './entities/login-log.entity';
import { AuditLogService } from '../common/audit-log.service';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>, @InjectRepository(LoginLog) private loginLogRepo: Repository<LoginLog>, private dataSource: DataSource, private auditLog: AuditLogService) {}

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('密码至少8个字符');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('密码必须包含大写字母');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('密码必须包含小写字母');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('密码必须包含数字');
    }
  }

  async findAll(page = 1, pageSize = 20) {
    const [items, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ['id', 'username', 'email', 'displayName', 'role', 'avatarUrl', 'isActive', 'lastLoginAt', 'createdAt'],
    });
    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'displayName', 'role', 'avatarUrl', 'isActive', 'lastLoginAt', 'createdAt'],
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(data: { username: string; email: string; password: string; display_name?: string; role?: string }, userId?: number) {
    this.validatePassword(data.password);
    const existing = await this.userRepo.findOne({
      where: [{ username: data.username }, { email: data.email }],
    });
    if (existing) throw new ConflictException('用户名或邮箱已存在');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      username: data.username,
      email: data.email,
      passwordHash,
      displayName: data.display_name || data.username,
      role: data.role || 'viewer',
    });
    await this.userRepo.save(user);
    await this.auditLog.log(userId || null, 'create', 'user', user.id, null, { username: user.username, role: user.role, email: user.email });
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: number, data: Partial<{ display_name: string; email: string; role: string; is_active: boolean; password: string }>, userId?: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    
    // Prevent disabling the last active admin
    if (data.is_active === false && user.role === 'admin') {
      const activeAdmins = await this.userRepo.count({ where: { role: 'admin', isActive: true } });
      if (activeAdmins <= 1) {
        throw new BadRequestException('不能禁用最后一个管理员账户');
      }
    }
    
    if (data.display_name !== undefined) user.displayName = data.display_name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role !== undefined) user.role = data.role;
    if (data.is_active !== undefined) user.isActive = data.is_active;
    if (data.password) {
      this.validatePassword(data.password);
      user.passwordHash = await bcrypt.hash(data.password, 10);
    }
    const oldValues = { isActive: user.isActive, role: user.role, email: user.email };
    await this.userRepo.save(user);
    await this.auditLog.log(userId || null, 'update', 'user', user.id, oldValues, { isActive: user.isActive, role: user.role, email: user.email });
    const { passwordHash, ...result } = user;
    return result;
  }

  async getRolePermissions(role?: string) {
    const where = role ? 'WHERE role = $1' : '';
    const params = role ? [role] : [];
    return this.dataSource.query(
      'SELECT * FROM role_permissions ' + where + ' ORDER BY role, module',
      params
    );
  }

  async updateRolePermission(role: string, module: string, data: { can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean }) {
    await this.dataSource.query(
      'INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (role, module) DO UPDATE SET can_view = $3, can_create = $4, can_edit = $5, can_delete = $6',
      [role, module, data.can_view ?? false, data.can_create ?? false, data.can_edit ?? false, data.can_delete ?? false]
    );
    return { success: true };
  }

  async getAuditLogs(limit = 50) {
    return this.dataSource.query(
      'SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT $1',
      [limit]
    );
  }

  async getLoginLogs(userId?: number, limit = 50) {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.loginLogRepo.find({ where, order: { createdAt: 'DESC' }, take: limit });
  }

  async remove(id: number, userId?: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    // Delete related records first
    await this.dataSource.query('DELETE FROM login_logs WHERE user_id = $1', [id]);
    await this.auditLog.log(userId || null, 'delete', 'user', id, { username: user.username }, null);
    await this.userRepo.remove(user);
  }
}
