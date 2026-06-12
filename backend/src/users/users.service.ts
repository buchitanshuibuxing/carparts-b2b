import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

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

  async create(data: { username: string; email: string; password: string; display_name?: string; role?: string }) {
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
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: number, data: Partial<{ display_name: string; email: string; role: string; is_active: boolean; password: string }>) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (data.display_name !== undefined) user.displayName = data.display_name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role !== undefined) user.role = data.role;
    if (data.is_active !== undefined) user.isActive = data.is_active;
    if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
    await this.userRepo.save(user);
    const { passwordHash, ...result } = user;
    return result;
  }

  async remove(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.userRepo.remove(user);
  }
}
