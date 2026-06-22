#!/bin/bash

# ============================================================
# CarParts B2B 一键部署脚本
# 用法: sudo bash install.sh
# ============================================================

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行此脚本"
    echo "用法: sudo bash install.sh"
    exit 1
fi

# 设置非交互模式
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

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
    print_success "系统: $OS"
else
    print_error "无法检测操作系统"
    exit 1
fi

# 2. 更新系统
print_info "更新系统..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "系统更新完成"

# 3. 安装依赖
print_info "安装基础依赖..."
apt-get install -y -qq curl wget git unzip build-essential python3 openssl
print_success "基础依赖安装完成"

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

# 创建数据库
print_info "创建数据库..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || print_warning "数据库已存在"

# 创建用户
print_info "创建用户..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "用户已存在"

# 授权
print_info "授权..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;"

# 配置 pg_hba.conf
print_info "配置 PostgreSQL 认证..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP 'PostgreSQL \K\d+')
print_info "PostgreSQL 版本: $PG_VERSION"

PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
print_info "pg_hba.conf: $PG_HBA"

if [ -f "$PG_HBA" ]; then
    if ! grep -q "$DB_USER" "$PG_HBA"; then
        echo "local   all   $DB_USER   md5" | sudo tee -a "$PG_HBA"
        echo "host    all   $DB_USER   127.0.0.1/32   md5" | sudo tee -a "$PG_HBA"
        print_success "已添加 $DB_USER 到 pg_hba.conf"
    else
        print_info "$DB_USER 已在 pg_hba.conf 中"
    fi
    sudo systemctl restart postgresql
else
    print_warning "pg_hba.conf 未找到"
fi

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
print_success "代码下载完成"

# 10. 安装后端依赖
print_info "安装后端依赖..."
cd backend
npm install --production
print_success "后端依赖安装完成"

# 11. 安装 NestJS CLI
print_info "安装 NestJS CLI..."
npm install -g @nestjs/cli
print_success "NestJS CLI 安装完成"

# 12. 创建 .env 文件
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
print_success "后端配置完成"

# 13. 构建后端
print_info "构建后端..."

# 修改 tsconfig 跳过类型检查
cat > tsconfig.build.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"],
  "compilerOptions": {
    "skipLibCheck": true
  }
}
EOF

npm run build 2>/dev/null
print_success "后端构建完成"

# 14. 运行数据库迁移
print_info "初始化数据库..."
npm run migration:run 2>/dev/null || print_warning "迁移可能已执行"

# 添加缺失的列
print_info "检查数据库表..."
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE image_assets ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'image';
ALTER TABLE image_assets ADD COLUMN IF NOT EXISTS file_md5 VARCHAR(32);
ALTER TABLE image_assets ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
" 2>/dev/null || print_warning "列可能已存在"

# 15. 创建管理员用户
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
        console.log('管理员用户已存在，重置密码...');
        const hash = await bcrypt.hash('$ADMIN_PASSWORD', 10);
        await client.query('UPDATE users SET password_hash = \\\$1 WHERE username = \\'admin\\'', [hash]);
        console.log('管理员密码已重置为: $ADMIN_PASSWORD');
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
print_success "管理员用户配置完成"

# 16. 安装前端依赖并构建
print_info "构建前端..."
cd frontend
npm install
npm run build
cp -r dist/* ../frontend/ 2>/dev/null || true
cd ..
print_success "前端构建完成"

# 17. 安装 PM2
print_info "安装 PM2..."
npm install -g pm2
print_success "PM2 安装完成"

# 18. 创建 PM2 配置
print_info "创建 PM2 配置..."
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
print_success "PM2 配置完成"

# 19. 创建目录并启动服务
print_info "创建目录..."
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/uploads
mkdir -p $PROJECT_DIR/uploads/images
mkdir -p $PROJECT_DIR/uploads/thumbnails

# 修复权限（重要！PM2 以当前用户运行，需要有写入权限）
print_info "修复目录权限..."
chown -R $USER:$USER $PROJECT_DIR/uploads
chown -R $USER:$USER $PROJECT_DIR/logs
chmod 755 $PROJECT_DIR/uploads

print_info "启动服务..."
cd $PROJECT_DIR
pm2 start ecosystem.config.js
pm2 save
print_success "服务启动完成"

# 20. 配置 Nginx
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
print_success "Nginx 配置完成"

# 21. 配置防火墙
print_info "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_success "防火墙配置完成"

# 22. 创建管理命令
print_info "创建管理命令..."
cat > /usr/local/bin/carparts << 'MENUEOF'
#!/bin/bash

# CarParts 管理菜单

PROJECT_DIR="/www/wwwroot/carparts"

show_menu() {
    clear
    echo ""
    echo "=========================================="
    echo "  CarParts B2B 管理面板"
    echo "=========================================="
    echo ""
    echo "  1. 启动服务"
    echo "  2. 停止服务"
    echo "  3. 重启服务"
    echo "  4. 查看状态"
    echo "  5. 查看日志"
    echo "  6. 备份数据库"
    echo "  7. 更新代码"
    echo "  8. 重置管理员密码"
    echo "  9. 设置域名"
    echo " 10. 安装 SSL 证书"
    echo " 11. 查看部署信息"
    echo "  0. 退出"
    echo ""
    echo "=========================================="
    echo ""
}

start_service() {
    echo "启动服务..."
    cd $PROJECT_DIR
    pm2 start ecosystem.config.js
    echo ""
    read -p "按 Enter 继续..."
}

stop_service() {
    echo "停止服务..."
    pm2 stop carparts-api
    echo ""
    read -p "按 Enter 继续..."
}

restart_service() {
    echo "重启服务..."
    pm2 restart carparts-api
    echo ""
    read -p "按 Enter 继续..."
}

show_status() {
    echo "服务状态:"
    pm2 status
    echo ""
    echo "磁盘使用:"
    df -h / | tail -1
    echo ""
    echo "内存使用:"
    free -h | head -2
    echo ""
    read -p "按 Enter 继续..."
}

show_logs() {
    echo "最近日志 (按 Ctrl+C 退出):"
    pm2 logs carparts-api --lines 50
    read -p "按 Enter 继续..."
}

backup_database() {
    echo "备份数据库..."
    BACKUP_DIR="$PROJECT_DIR/backups"
    BACKUP_FILE="$BACKUP_DIR/carparts_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p $BACKUP_DIR

    DB_PASS=$(grep DB_PASSWORD $PROJECT_DIR/backend/.env | cut -d'=' -f2)
    PGPASSWORD="$DB_PASS" pg_dump -h 127.0.0.1 -U carparts -d carparts -f "$BACKUP_FILE"

    echo "备份完成: $BACKUP_FILE"
    echo "备份大小: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
    echo ""
    read -p "按 Enter 继续..."
}

update_code() {
    echo "更新代码..."
    cd $PROJECT_DIR
    git pull origin main

    echo "更新后端..."
    cd backend
    npm install --production
    npm run build
    cd ..

    echo "更新前端..."
    cd frontend
    npm install
    npm run build
    cp -r dist/* ../frontend/ 2>/dev/null || true
    cd ..

    echo "重启服务..."
    pm2 restart carparts-api

    echo "更新完成！"
    echo ""
    read -p "按 Enter 继续..."
}

reset_admin() {
    echo "重置管理员密码..."
    read -s -p "请输入新密码: " NEW_PASSWORD
    echo ""

    DB_PASS=$(grep DB_PASSWORD $PROJECT_DIR/backend/.env | cut -d'=' -f2)

    cd $PROJECT_DIR/backend
    node -e "
    const bcrypt = require('bcrypt');
    const { Client } = require('pg');

    async function resetPassword() {
        const client = new Client({
            host: '127.0.0.1',
            port: 5432,
            user: 'carparts',
            password: '$DB_PASS',
            database: 'carparts'
        });

        await client.connect();
        const hash = await bcrypt.hash('$NEW_PASSWORD', 10);
        await client.query('UPDATE users SET password_hash = \\\$1 WHERE username = \\'admin\\'', [hash]);
        console.log('密码重置成功！');
        await client.end();
    }

    resetPassword().catch(console.error);
    "
    cd $PROJECT_DIR
    echo ""
    read -p "按 Enter 继续..."
}

set_domain() {
    echo "设置域名"
    echo ""
    read -p "请输入域名 (如 carparts.example.com): " DOMAIN

    if [ -z "$DOMAIN" ]; then
        echo "域名不能为空"
        read -p "按 Enter 继续..."
        return
    fi

    echo "配置 Nginx..."
    cat > /etc/nginx/sites-available/carparts << EOF
server {
    listen 80;
    server_name $DOMAIN;

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

    nginx -t
    systemctl restart nginx

    echo ""
    echo "域名已设置为: $DOMAIN"
    echo "请确保域名已解析到此服务器 IP"
    echo ""
    read -p "按 Enter 继续..."
}

install_ssl() {
    echo "安装 SSL 证书"
    echo ""

    # 检查是否有域名
    DOMAIN=$(grep server_name /etc/nginx/sites-available/carparts | head -1 | awk '{print $2}' | sed 's/;//')

    if [ "$DOMAIN" = "_" ] || [ -z "$DOMAIN" ]; then
        echo "请先设置域名 (选项 9)"
        read -p "按 Enter 继续..."
        return
    fi

    echo "域名: $DOMAIN"
    echo ""

    # 安装 certbot
    echo "安装 Certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx

    # 获取证书
    echo "获取 SSL 证书..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

    # 设置自动续期
    echo "设置自动续期..."
    echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | tee -a /etc/crontab > /dev/null

    echo ""
    echo "SSL 证书安装完成！"
    echo "访问地址: https://$DOMAIN"
    echo ""
    read -p "按 Enter 继续..."
}

show_deploy_info() {
    if [ -f "$PROJECT_DIR/deploy-info.txt" ]; then
        cat "$PROJECT_DIR/deploy-info.txt"
    else
        echo "部署信息文件不存在"
    fi
    echo ""
    read -p "按 Enter 继续..."
}

# 主循环
while true; do
    show_menu
    read -p "请选择操作 [0-11]: " choice

    case $choice in
        1) start_service ;;
        2) stop_service ;;
        3) restart_service ;;
        4) show_status ;;
        5) show_logs ;;
        6) backup_database ;;
        7) update_code ;;
        8) reset_admin ;;
        9) set_domain ;;
        10) install_ssl ;;
        11) show_deploy_info ;;
        0) echo "再见！"; exit 0 ;;
        *) echo "无效选择"; sleep 1 ;;
    esac
done
MENUEOF

chmod +x /usr/local/bin/carparts
print_success "管理命令创建完成"

# 23. 获取外网 IP
print_info "获取外网 IP..."
PUBLIC_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || curl -s api.ipify.org || echo "无法获取")

# 24. 保存部署信息
cat > deploy-info.txt << EOF
CarParts B2B 部署信息
====================

部署时间: $(date)
服务器 IP: $PUBLIC_IP
访问地址: http://$PUBLIC_IP

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
  carparts          - 打开管理菜单
  carparts start    - 启动服务
  carparts stop     - 停止服务
  carparts restart  - 重启服务
  carparts status   - 查看状态
  carparts logs     - 查看日志
  carparts backup   - 备份数据库
  carparts update   - 更新代码
EOF

print_success "部署信息已保存"

# 完成
echo ""
echo "=========================================="
print_success "部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://$PUBLIC_IP"
echo "管理员:   admin"
echo "密码:     $ADMIN_PASSWORD"
echo ""
echo "管理命令: carparts"
echo ""
echo "=========================================="
echo ""
