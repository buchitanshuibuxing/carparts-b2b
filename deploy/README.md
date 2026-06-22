# CarParts B2B 部署指南

## 系统要求

- **操作系统**: Ubuntu 20.04+ / Debian 11+
- **内存**: 2GB 以上
- **硬盘**: 20GB 以上
- **网络**: 可访问外网

## 一键部署

### 1. 上传脚本到服务器

```bash
# 将 deploy 目录上传到服务器
scp -r deploy/ root@your-server-ip:/tmp/
```

### 2. 登录服务器

```bash
ssh root@your-server-ip
```

### 3. 运行安装脚本

```bash
cd /tmp/deploy
chmod +x install.sh
sudo bash install.sh
```

### 4. 按提示输入配置

- **域名**: 如 `carparts.example.com`（可选）
- **数据库密码**: 自动生成或手动设置
- **JWT 密钥**: 自动生成或手动设置
- **管理员密码**: 默认 `admin123`

### 5. 等待安装完成

安装过程约 10-20 分钟，取决于网络速度。

## 安装完成后

### 访问地址

- **HTTP**: `http://your-server-ip` 或 `http://your-domain`
- **HTTPS**: `https://your-domain`（如果配置了 SSL）

### 管理员账号

- **用户名**: `admin`
- **密码**: 安装时设置的密码

### 配置信息

安装信息保存在 `/www/wwwroot/carparts/deploy-info.txt`

## 管理命令

安装完成后，可以使用 `carparts` 命令管理服务：

```bash
# 启动服务
carparts start

# 停止服务
carparts stop

# 重启服务
carparts restart

# 查看状态
carparts status

# 查看日志
carparts logs

# 备份数据库
carparts backup

# 更新代码
carparts update
```

## 更新系统

### 方法一：使用更新脚本

```bash
cd /tmp/deploy
chmod +x update.sh
sudo bash update.sh
```

### 方法二：手动更新

```bash
# 进入项目目录
cd /www/wwwroot/carparts

# 拉取最新代码
git pull origin main

# 更新后端
cd backend
npm install --production
npm run build

# 更新前端
cd ../frontend
npm install
npm run build
cp -r dist/* /www/wwwroot/carparts/frontend/

# 重启服务
pm2 restart carparts-api
```

## 数据备份

### 自动备份

安装脚本会配置每日自动备份，备份文件保存在：

```
/www/wwwroot/carparts/backups/
```

### 手动备份

```bash
carparts backup
```

### 恢复备份

```bash
# 停止服务
carparts stop

# 恢复数据库
PGPASSWORD="your-password" psql -h 127.0.0.1 -U carparts -d carparts -f /www/wwwroot/carparts/backups/carparts_XXXXXXXX_XXXXXX.sql

# 启动服务
carparts start
```

## 常见问题

### 1. 无法访问网站

检查防火墙：
```bash
ufw status
ufw allow 80/tcp
ufw allow 443/tcp
```

检查 Nginx 状态：
```bash
systemctl status nginx
nginx -t
```

### 2. 数据库连接失败

检查 PostgreSQL 状态：
```bash
systemctl status postgresql
```

检查数据库配置：
```bash
cat /www/wwwroot/carparts/backend/.env
```

### 3. PM2 服务异常

查看日志：
```bash
pm2 logs carparts-api
```

重启服务：
```bash
pm2 restart carparts-api
```

### 4. 文件上传失败

检查上传目录权限：
```bash
ls -la /www/wwwroot/carparts/uploads/
chown -R www:www /www/wwwroot/carparts/uploads/
```

## 目录结构

```
/www/wwwroot/carparts/
├── backend/              # 后端代码
│   ├── src/             # 源代码
│   ├── dist/            # 编译后的代码
│   ├── node_modules/    # 依赖
│   └── .env             # 环境配置
├── frontend/            # 前端代码
│   ├── src/             # 源代码
│   └── dist/            # 构建后的代码
├── uploads/             # 上传的文件
├── backups/             # 数据库备份
├── logs/                # 日志文件
└── ecosystem.config.js  # PM2 配置
```

## 安全建议

1. **修改默认密码**: 安装后立即修改管理员密码
2. **配置 HTTPS**: 使用 Let's Encrypt 配置 SSL 证书
3. **定期备份**: 确保自动备份正常运行
4. **更新系统**: 定期更新系统和依赖包
5. **限制访问**: 配置防火墙只开放必要端口

## 技术支持

- **GitHub**: https://github.com/buchitanshuibuxing/carparts-b2b
- **Issues**: https://github.com/buchitanshuibuxing/carparts-b2b/issues
