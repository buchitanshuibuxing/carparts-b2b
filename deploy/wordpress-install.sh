#!/bin/bash

# ============================================================
# CarParts B2B WordPress 风格一键部署脚本
# 用法: sudo bash wordpress-install.sh
# ============================================================

set -e

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

PROJECT_DIR="/www/wwwroot/carparts"

print_info "开始安装 CarParts B2B..."

# 1. 安装 Node.js
print_info "安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
print_success "Node.js $(node -v)"

# 2. 安装 PostgreSQL
print_info "安装 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi
print_success "PostgreSQL 已安装"

# 3. 安装 Nginx
print_info "安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
print_success "Nginx 已安装"

# 4. 创建项目目录
print_info "创建项目目录..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 5. 下载代码
print_info "下载代码..."
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/buchitanshuibuxing/carparts-b2b.git temp
    mv temp/* temp/.* . 2>/dev/null || true
    rm -rf temp
fi

# 6. 安装依赖
print_info "安装依赖..."
cd backend && npm install --production && cd ..
cd frontend && npm install && npm run build && cd ..

# 7. 复制前端文件
cp -r frontend/dist/* frontend/ 2>/dev/null || true

# 8. 安装 PM2
print_info "安装 PM2..."
npm install -g pm2

# 9. 创建安装向导
print_info "创建安装向导..."
cat > "$PROJECT_DIR/install/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CarParts B2B - 安装向导</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 40px; max-width: 500px; width: 90%; }
        h1 { text-align: center; color: #1e40af; margin-bottom: 30px; font-size: 24px; }
        .step { display: none; }
        .step.active { display: block; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
        input, select { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        input:focus, select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .btn { width: 100%; padding: 14px; background: #1e40af; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; }
        .btn:hover { background: #1e3a8a; }
        .btn:disabled { background: #9ca3af; cursor: not-allowed; }
        .btn-secondary { background: #6b7280; margin-top: 10px; }
        .btn-secondary:hover { background: #4b5563; }
        .progress { text-align: center; padding: 40px; }
        .spinner { border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .success { text-align: center; color: #059669; }
        .success h2 { margin-bottom: 20px; }
        .error { color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 20px; display: none; }
        .info { background: #eff6ff; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; color: #1e40af; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 CarParts B2B 安装向导</h1>

        <!-- 步骤 1: 数据库配置 -->
        <div id="step1" class="step active">
            <h3 style="margin-bottom: 20px; color: #374151;">数据库配置</h3>
            <div class="info">请确保 PostgreSQL 已安装并运行</div>
            <div class="error" id="dbError"></div>
            <div class="form-group">
                <label>数据库主机</label>
                <input type="text" id="dbHost" value="127.0.0.1" placeholder="127.0.0.1">
            </div>
            <div class="form-group">
                <label>数据库端口</label>
                <input type="text" id="dbPort" value="5432" placeholder="5432">
            </div>
            <div class="form-group">
                <label>数据库用户</label>
                <input type="text" id="dbUser" value="postgres" placeholder="postgres">
            </div>
            <div class="form-group">
                <label>数据库密码</label>
                <input type="password" id="dbPassword" placeholder="输入数据库密码">
            </div>
            <div class="form-group">
                <label>数据库名称</label>
                <input type="text" id="dbName" value="carparts" placeholder="carparts">
            </div>
            <button class="btn" onclick="testConnection()">测试连接</button>
        </div>

        <!-- 步骤 2: 管理员设置 -->
        <div id="step2" class="step">
            <h3 style="margin-bottom: 20px; color: #374151;">管理员设置</h3>
            <div class="form-group">
                <label>管理员用户名</label>
                <input type="text" id="adminUser" value="admin" placeholder="admin">
            </div>
            <div class="form-group">
                <label>管理员密码</label>
                <input type="password" id="adminPassword" placeholder="设置管理员密码">
            </div>
            <div class="form-group">
                <label>确认密码</label>
                <input type="password" id="adminPasswordConfirm" placeholder="再次输入密码">
            </div>
            <div class="form-group">
                <label>管理员邮箱</label>
                <input type="email" id="adminEmail" placeholder="admin@example.com">
            </div>
            <button class="btn" onclick="install()">开始安装</button>
            <button class="btn btn-secondary" onclick="showStep(1)">上一步</button>
        </div>

        <!-- 步骤 3: 安装中 -->
        <div id="step3" class="step">
            <div class="progress">
                <div class="spinner"></div>
                <p id="installStatus">正在安装...</p>
            </div>
        </div>

        <!-- 步骤 4: 安装完成 -->
        <div id="step4" class="step">
            <div class="success">
                <h2>✅ 安装成功！</h2>
                <p style="margin-bottom: 20px;">CarParts B2B 已成功安装</p>
                <div class="info" style="text-align: left;">
                    <p><strong>访问地址:</strong> <span id="siteUrl"></span></p>
                    <p><strong>管理员:</strong> <span id="adminInfo"></span></p>
                </div>
                <button class="btn" onclick="goToSite()">进入系统</button>
            </div>
        </div>
    </div>

    <script>
        let dbConfig = {};

        function showStep(n) {
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            document.getElementById('step' + n).classList.add('active');
        }

        async function testConnection() {
            const errorEl = document.getElementById('dbError');
            errorEl.style.display = 'none';

            dbConfig = {
                host: document.getElementById('dbHost').value,
                port: document.getElementById('dbPort').value,
                user: document.getElementById('dbUser').value,
                password: document.getElementById('dbPassword').value,
                name: document.getElementById('dbName').value
            };

            try {
                const res = await fetch('/api/install/test-db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbConfig)
                });
                const data = await res.json();

                if (data.success) {
                    showStep(2);
                } else {
                    errorEl.textContent = data.message || '连接失败';
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                errorEl.textContent = '连接失败: ' + err.message;
                errorEl.style.display = 'block';
            }
        }

        async function install() {
            const password = document.getElementById('adminPassword').value;
            const passwordConfirm = document.getElementById('adminPasswordConfirm').value;

            if (password !== passwordConfirm) {
                alert('两次密码不一致');
                return;
            }

            showStep(3);

            const config = {
                ...dbConfig,
                adminUser: document.getElementById('adminUser').value,
                adminPassword: password,
                adminEmail: document.getElementById('adminEmail').value
            };

            try {
                const res = await fetch('/api/install', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                const data = await res.json();

                if (data.success) {
                    document.getElementById('siteUrl').textContent = window.location.origin;
                    document.getElementById('adminInfo').textContent = config.adminUser;
                    showStep(4);
                } else {
                    alert('安装失败: ' + data.message);
                    showStep(2);
                }
            } catch (err) {
                alert('安装失败: ' + err.message);
                showStep(2);
            }
        }

        function goToSite() {
            window.location.href = '/';
        }

        // 检查是否已安装
        fetch('/api/install/status').then(r => r.json()).then(data => {
            if (data.installed) {
                document.getElementById('siteUrl').textContent = window.location.origin;
                document.getElementById('adminInfo').textContent = data.adminUser || 'admin';
                showStep(4);
            }
        }).catch(() => {});
    </script>
</body>
</html>
HTMLEOF

# 10. 创建安装 API
print_info "创建安装 API..."
mkdir -p "$PROJECT_DIR/backend/src/install"
cat > "$PROJECT_DIR/backend/src/install/install.controller.ts" << 'TSEOF'
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
TSEOF

# 11. 创建安装模块
cat > "$PROJECT_DIR/backend/src/install/install.module.ts" << 'TSEOF'
import { Module } from '@nestjs/common';
import { InstallController } from './install.controller';

@Module({
  controllers: [InstallController],
})
export class InstallModule {}
TSEOF

# 12. 更新 app.module.ts
print_info "更新配置..."
cd "$PROJECT_DIR/backend"

# 检查是否已导入 InstallModule
if ! grep -q "InstallModule" src/app.module.ts; then
    # 添加导入
    sed -i "s/import { SettingsModule } from '.\/settings\/settings.module';/import { SettingsModule } from '.\/settings\/settings.module';\nimport { InstallModule } from '.\/install\/install.module';/" src/app.module.ts

    # 添加到 imports 数组
    sed -i "s/SettingsModule,/SettingsModule,\n    InstallModule,/" src/app.module.ts
fi

# 13. 构建后端
print_info "构建后端..."
npm run build

# 14. 配置 Nginx
print_info "配置 Nginx..."
cat > /etc/nginx/sites-available/carparts << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    root /www/wwwroot/carparts/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /uploads/ {
        alias /www/wwwroot/carparts/uploads/;
        expires 30d;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 50M;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/carparts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 15. 创建 PM2 配置
print_info "创建 PM2 配置..."
cat > "$PROJECT_DIR/ecosystem.config.js" << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'carparts-api',
    script: 'dist/main.js',
    cwd: '/www/wwwroot/carparts/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    error_file: '/www/wwwroot/carparts/logs/error.log',
    out_file: '/www/wwwroot/carparts/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    node_args: '--max-old-space-size=1024',
    autorestart: true,
    watch: false,
  }]
};
PM2EOF

# 16. 启动服务
print_info "启动服务..."
mkdir -p "$PROJECT_DIR/logs"
cd "$PROJECT_DIR"
pm2 start ecosystem.config.js
pm2 save

# 17. 创建管理命令
cat > /usr/local/bin/carparts << 'CMDEOF'
#!/bin/bash
case "$1" in
    start) cd /www/wwwroot/carparts && pm2 start ecosystem.config.js ;;
    stop) pm2 stop carparts-api ;;
    restart) pm2 restart carparts-api ;;
    status) pm2 status ;;
    logs) pm2 logs carparts-api ;;
    *) echo "用法: carparts {start|stop|restart|status|logs}" ;;
esac
CMDEOF
chmod +x /usr/local/bin/carparts

print_success "安装完成！"
echo ""
echo "=========================================="
echo "  CarParts B2B 安装完成！"
echo "=========================================="
echo ""
echo "现在请访问您的服务器 IP 地址"
echo "系统会自动显示安装向导"
echo ""
echo "管理命令: carparts {start|stop|restart|status|logs}"
echo "=========================================="
