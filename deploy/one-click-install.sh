#!/bin/bash

# ============================================================
# CarParts B2B 一键部署脚本
# 用法: curl -sL https://raw.githubusercontent.com/buchitanshuibuxing/carparts-b2b/main/deploy/one-click-install.sh | bash
# ============================================================

set -e

# 设置非交互模式，避免提示
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# 配置
PROJECT_DIR="/www/wwwroot/carparts"
DB_NAME="carparts"
DB_USER="carparts"
DB_PASSWORD=$(openssl rand -base64 12)
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD="admin123"

echo ""
echo "=========================================="
echo "  CarParts B2B 一键部署"
echo "=========================================="
echo ""

# 1. 检查系统
print_info "检查系统..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "无法检测操作系统"
    exit 1
fi

# 2. 更新系统
print_info "更新系统..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# 自动处理 outdated libraries 问题
print_info "处理系统服务..."
needrestart -r a 2>/dev/null || true

# 3. 安装依赖
print_info "安装依赖..."
apt-get install -y -qq curl wget git unzip build-essential python3 openssl

# 4. 安装 Node.js
print_info "安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
print_success "Node.js $(node -v)"

# 5. 安装 PostgreSQL
print_info "安装 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y -qq postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi
print_success "PostgreSQL 已安装"

# 6. 配置数据库
print_info "配置数据库..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;" 2>/dev/null || true

# 配置 pg_hba.conf
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
if ! grep -q "$DB_USER" "$PG_HBA"; then
    echo "local   all   $DB_USER   md5" | sudo tee -a "$PG_HBA"
    echo "host    all   $DB_USER   127.0.0.1/32   md5" | sudo tee -a "$PG_HBA"
fi
sudo systemctl restart postgresql
print_success "数据库配置完成"

# 7. 安装 Nginx
print_info "安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y -qq nginx
    systemctl start nginx
    systemctl enable nginx
fi
print_success "Nginx 已安装"

# 8. 创建项目目录
print_info "创建项目目录..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 9. 下载代码
print_info "下载代码..."
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/buchitanshuibuxing/carparts-b2b.git temp
    mv temp/* temp/.* . 2>/dev/null || true
    rm -rf temp
fi

# 10. 安装后端依赖
print_info "安装后端依赖..."
cd backend
npm install --production

# 11. 创建 .env 文件
print_info "配置后端..."
cat > .env << EOF
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=*
UPLOAD_DIR=$PROJECT_DIR/uploads
MAX_FILE_SIZE=52428800
EOF

# 12. 构建后端
print_info "构建后端..."
npm run build

# 13. 运行数据库迁移
print_info "初始化数据库..."
npm run migration:run 2>/dev/null || true

# 14. 创建管理员用户
print_info "创建管理员用户..."
node -e "
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createAdmin() {
    const client = new Client({
        host: '127.0.0.1',
        port: 5432,
        user: '$DB_USER',
        password: '$DB_PASSWORD',
        database: '$DB_NAME'
    });

    await client.connect();

    // 检查表是否存在
    const tableCheck = await client.query(
        \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');\"
    );

    if (!tableCheck.rows[0].exists) {
        console.log('用户表不存在，跳过创建管理员');
        await client.end();
        return;
    }

    // 检查是否已有管理员
    const adminCheck = await client.query(
        \"SELECT id FROM users WHERE username = 'admin';\"
    );

    if (adminCheck.rows.length > 0) {
        console.log('管理员用户已存在');
        await client.end();
        return;
    }

    // 创建管理员
    const hash = await bcrypt.hash('$ADMIN_PASSWORD', 10);
    await client.query(
        'INSERT INTO users (username, email, password_hash, display_name, role, is_active) VALUES (\\\$1, \\\$2, \\\$3, \\\$4, \\\$5, \\\$6)',
        ['admin', 'admin@carparts.com', hash, 'Administrator', 'admin', true]
    );

    console.log('管理员用户创建成功');
    await client.end();
}

createAdmin().catch(console.error);
" 2>/dev/null || print_warning "管理员用户创建失败，请手动创建"

cd ..

# 15. 安装前端依赖并构建
print_info "构建前端..."
cd frontend
npm install
npm run build
cp -r dist/* ../frontend/ 2>/dev/null || true
cd ..

# 16. 安装 PM2
print_info "安装 PM2..."
npm install -g pm2

# 17. 创建 PM2 配置
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'carparts-api',
    script: 'dist/main.js',
    cwd: '$PROJECT_DIR/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    error_file: '$PROJECT_DIR/logs/error.log',
    out_file: '$PROJECT_DIR/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    node_args: '--max-old-space-size=1024',
    autorestart: true,
    watch: false,
  }]
};
EOF

# 18. 启动服务
print_info "启动服务..."
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save

# 19. 配置 Nginx
print_info "配置 Nginx..."
cat > /etc/nginx/sites-available/carparts << EOF
server {
    listen 80;
    server_name _;

    root $PROJECT_DIR/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 600s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }

    location /uploads/ {
        alias $PROJECT_DIR/uploads/;
        expires 30d;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    client_max_body_size 50M;
}
EOF

ln -sf /etc/nginx/sites-available/carparts /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 20. 配置防火墙
print_info "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 21. 创建管理命令
cat > /usr/local/bin/carparts << 'EOF'
#!/bin/bash
case "$1" in
    start) cd /www/wwwroot/carparts && pm2 start ecosystem.config.js ;;
    stop) pm2 stop carparts-api ;;
    restart) pm2 restart carparts-api ;;
    status) pm2 status ;;
    logs) pm2 logs carparts-api ;;
    *) echo "用法: carparts {start|stop|restart|status|logs}" ;;
esac
EOF
chmod +x /usr/local/bin/carparts

# 22. 保存部署信息
cat > deploy-info.txt << EOF
CarParts B2B 部署信息
====================

部署时间: $(date)
服务器 IP: $(hostname -I | awk '{print $1}')
访问地址: http://$(hostname -I | awk '{print $1}')

管理员账号: admin
管理员密码: $ADMIN_PASSWORD

数据库信息:
  主机: 127.0.0.1
  端口: 5432
  用户: $DB_USER
  密码: $DB_PASSWORD
  数据库: $DB_NAME

JWT 密钥: $JWT_SECRET

管理命令:
  carparts start    - 启动服务
  carparts stop     - 停止服务
  carparts restart  - 重启服务
  carparts status   - 查看状态
  carparts logs     - 查看日志
EOF

# 完成
echo ""
echo "=========================================="
print_success "部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://$(hostname -I | awk '{print $1}')"
echo "管理员:   admin"
echo "密码:     $ADMIN_PASSWORD"
echo ""
echo "部署信息已保存到: $PROJECT_DIR/deploy-info.txt"
echo ""
echo "管理命令:"
echo "  carparts start    - 启动服务"
echo "  carparts stop     - 停止服务"
echo "  carparts restart  - 重启服务"
echo "  carparts status   - 查看状态"
echo "  carparts logs     - 查看日志"
echo "=========================================="
echo ""
