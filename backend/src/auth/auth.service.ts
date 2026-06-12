import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { User } from "../users/entities/user.entity";
import { LoginLog } from "../users/entities/login-log.entity";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(LoginLog) private loginLogRepo: Repository<LoginLog>,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({
      where: [{ username }, { email: username }],
    });
    if (!user) {
      try {
        await this.loginLogRepo.save({ username: username, status: "failed", ipAddress: "" });
      } catch {}
      throw new UnauthorizedException("用户名或密码错误");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("账户已禁用，请联系管理员");
    }
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      try {
        await this.loginLogRepo.save({ userId: user.id, username: user.username, status: "failed", ipAddress: "" });
      } catch {}
      throw new UnauthorizedException("用户名或密码错误");
    }
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);
    
    try {
      await this.loginLogRepo.save({
        userId: user.id,
        username: user.username,
        status: "success",
      });
    } catch {}
    
    return this.generateTokens(user);
  }

  async register(username: string, email: string, password: string, displayName?: string) {
    const existing = await this.userRepo.findOne({
      where: [{ username }, { email }],
    });
    if (existing) {
      throw new ConflictException("用户名或邮箱已存在");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      username, email, passwordHash,
      displayName: displayName || username,
      role: "viewer",
    });
    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...result } = user;
    let permissions: any[] = [];
    try {
      permissions = await this.userRepo.query(
        "SELECT module, can_view, can_create, can_edit, can_delete FROM role_permissions WHERE role = $1",
        [user.role]
      );
    } catch {}
    return { ...result, permissions };
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new UnauthorizedException("服务器配置错误");
      }
      const payload = this.jwtService.verify(refreshToken, { secret });
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException("刷新令牌无效");
    }
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: "7d" }),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
