import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Controller('api/install')
export class InstallController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get('status')
  async getStatus() {
    try {
      const result = await this.dataSource.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
      );
      const installed = result[0]?.exists || false;
      return { installed };
    } catch {
      return { installed: false };
    }
  }

  @Post('test-db')
  async testDatabase(@Body() config: any) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: config.host,
        port: parseInt(config.port),
        user: config.user,
        password: config.password,
        database: config.name
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  @Post()
  async install(@Body() config: any) {
    try {
      // 1. 创建数据库（如果不存在）
      const { Client } = require('pg');
      const adminClient = new Client({
        host: config.host,
        port: parseInt(config.port),
        user: config.user,
        password: config.password,
        database: 'postgres'
      });
      await adminClient.connect();

      try {
        await adminClient.query(`CREATE DATABASE ${config.name}`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
      }
      await adminClient.end();

      // 2. 运行迁移
      const dbClient = new Client({
        host: config.host,
        port: parseInt(config.port),
        user: config.user,
        password: config.password,
        database: config.name
      });
      await dbClient.connect();

      // 读取并执行迁移文件
      const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await dbClient.query(sql);
      }

      // 3. 创建管理员
      const hash = await bcrypt.hash(config.adminPassword, 10);
      await dbClient.query(
        `INSERT INTO users (username, email, password_hash, display_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO NOTHING`,
        [config.adminUser, config.adminEmail || 'admin@carparts.com', hash, 'Administrator', 'admin', true]
      );

      await dbClient.end();

      // 4. 保存配置
      const envContent = `
DB_HOST=${config.host}
DB_PORT=${config.port}
DB_USER=${config.user}
DB_PASSWORD=${config.password}
DB_NAME=${config.name}
JWT_SECRET=${require('crypto').randomBytes(32).toString('base64')}
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=*
UPLOAD_DIR=${path.join(__dirname, '..', '..', 'uploads')}
MAX_FILE_SIZE=52428800
      `.trim();

      fs.writeFileSync(path.join(__dirname, '..', '..', '.env'), envContent);

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
