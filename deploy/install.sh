#!/bin/bash

# ============================================================
# CarParts B2B 一键部署脚本
# 适用系统：Ubuntu 20.04+ / Debian 11+
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DOMAIN=""
DB_PASSWORD=""
JWT_SECRET=""
ADMIN_PASSWORD="admin123"
NODE_VERSION="20"
PROJECT_DIR="/www/wwwroot/carparts"
BACKEND_PORT=3000

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 用户运行此脚本"
        echo "示例: sudo bash install.sh"
        exit 1
    fi
}

# 检查系统
check_system() {
    print_info "检查系统环境..."

    # 检查操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        print_error "无法检测操作系统"
        exit 1
    fi

    # 检查是否为支持的系统
    if [[ "$OS" != "ubuntu" && "$OS" != "debian" ]]; then
        print_warning "此脚本主要针对 Ubuntu/Debian 系统，其他系统可能需要手动调整"
    fi

    print_success "系统: $OS $OS_VERSION"
}

# 获取用户输入
get_user_input() {
    echo ""
    echo "=========================================="
    echo "  CarParts B2B 部署配置"
    echo "=========================================="
    echo ""

    # 域名
    read -p "请输入域名 (如 carparts.example.com，留空使用 IP): " DOMAIN

    # 数据库密码
    read -s -p "请设置数据库密码 (留空自动生成): " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 16)
        print_info "已生成数据库密码: $DB_PASSWORD"
    fi

    # JWT 密钥
    read -s -p "请设置 JWT 密钥 (留空自动生成): " JWT_SECRET
    echo ""
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        print_info "已生成 JWT 密钥"
    fi

    # 管理员密码
    read -s -p "请设置管理员密码 (默认: admin123): " input_admin_pwd
    echo ""
    if [ -n "$input_admin_pwd" ]; then
        ADMIN_PASSWORD="$input_admin_pwd"
    fi

    echo ""
    echo "=========================================="
    echo "  配置确认"
    echo "=========================================="
    echo "域名: ${DOMAIN:-使用IP访问}"
    echo "数据库密码: $DB_PASSWORD"
    echo "管理员密码: $ADMIN_PASSWORD"
    echo "=========================================="
    echo ""

    read -p "确认开始安装？(y/n): " confirm
    if [ "$confirm" != "y" && "$confirm" != "Y" ]; then
        echo "安装已取消"
        exit 0
    fi
}

# 更新系统
update_system() {
    print_info "更新系统包..."
    apt-get update
    apt-get upgrade -y
    print_success "系统更新完成"
}

# 安装基础依赖
install_dependencies() {
    print_info "安装基础依赖..."
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        build-essential \
        python3 \
        openssl \
        ca-certificates \
        gnupg \
        lsb-release
    print_success "基础依赖安装完成"
}

# 安装 Node.js
install_nodejs() {
    print_info "安装 Node.js ${NODE_VERSION}..."

    # 检查是否已安装
    if command -v node &> /dev/null; then
        CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_NODE_VERSION" -ge "$NODE_VERSION" ]; then
            print_success "Node.js 已安装: $(node -v)"
            return
        fi
    fi

    # 安装 NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs

    # 验证安装
    print_success "Node.js 安装完成: $(node -v)"
    print_success "npm 版本: $(npm -v)"
}

# 安装 PostgreSQL
install_postgresql() {
    print_info "安装 PostgreSQL..."

    # 检查是否已安装
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL 已安装"
    else
        # 安装 PostgreSQL
        apt-get install -y postgresql postgresql-contrib

        # 启动服务
        systemctl start postgresql
        systemctl enable postgresql
    fi

    # 配置数据库
    print_info "配置数据库..."

    # 创建数据库和用户
    sudo -u postgres psql -c "CREATE DATABASE carparts;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER carparts WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE carparts TO carparts;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER carparts WITH SUPERUSER;" 2>/dev/null || true

    # 配置 PostgreSQL 允许本地连接
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

    # 备份原配置
    cp "$PG_HBA" "${PG_HBA}.backup"

    # 添加本地连接配置
    if ! grep -q "carparts" "$PG_HBA"; then
        echo "local   all   carparts   md5" >> "$PG_HBA"
        echo "host    all   carparts   127.0.0.1/32   md5" >> "$PG_HBA"
    fi

    # 重启 PostgreSQL
    systemctl restart postgresql

    print_success "PostgreSQL 配置完成"
}

# 安装 Nginx
install_nginx() {
    print_info "安装 Nginx..."

    # 检查是否已安装
    if command -v nginx &> /dev/null; then
        print_success "Nginx 已安装"
    else
        apt-get install -y nginx
        systemctl start nginx
        systemctl enable nginx
    fi

    print_success "Nginx 安装完成"
}

# 创建项目目录
create_project_dir() {
    print_info "创建项目目录..."

    mkdir -p "$PROJECT_DIR"
    mkdir -p "$PROJECT_DIR/backend"
    mkdir -p "$PROJECT_DIR/frontend"
    mkdir -p "$PROJECT_DIR/uploads"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/logs"

    print_success "项目目录创建完成"
}

# 下载项目代码
download_project() {
    print_info "下载项目代码..."

    cd "$PROJECT_DIR"

    # 克隆代码
    if [ -d ".git" ]; then
        print_info "更新现有代码..."
        git pull origin main
    else
        print_info "克隆项目代码..."
        git clone https://github.com/buchitanshuibuxing/carparts-b2b.git temp
        mv temp/* temp/.* . 2>/dev/null || true
        rm -rf temp
    fi

    print_success "项目代码下载完成"
}

# 配置后端
setup_backend() {
    print_info "配置后端..."

    cd "$PROJECT_DIR/backend"

    # 安装依赖
    print_info "安装后端依赖..."
    npm install --production

    # 创建 .env 文件
    cat > .env << EOF
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=carparts
DB_PASSWORD=$DB_PASSWORD
DB_NAME=carparts

# JWT 配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# 服务配置
PORT=$BACKEND_PORT
NODE_ENV=production

# CORS 配置
ALLOWED_ORIGINS=https://${DOMAIN:-localhost}

# 文件上传配置
UPLOAD_DIR=$PROJECT_DIR/uploads
MAX_FILE_SIZE=52428800
EOF

    # 构建后端
    print_info "构建后端..."
    npm run build

    # 初始化数据库
    print_info "初始化数据库..."
    npm run migration:run 2>/dev/null || true

    # 创建管理员用户
    print_info "创建管理员用户..."
    node -e "
    const bcrypt = require('bcrypt');
    const { Client } = require('pg');

    async function createAdmin() {
        const client = new Client({
            host: '127.0.0.1',
            port: 5432,
            user: 'carparts',
            password: '$DB_PASSWORD',
            database: 'carparts'
        });

        await client.connect();

        // 检查用户表是否存在
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
            'INSERT INTO users (username, email, password_hash, display_name, role, is_active) VALUES (\$1, \$2, \$3, \$4, \$5, \$6)',
            ['admin', 'admin@carparts.com', hash, 'Administrator', 'admin', true]
        );

        console.log('管理员用户创建成功');
        await client.end();
    }

    createAdmin().catch(console.error);
    " 2>/dev/null || print_warning "管理员用户创建失败，请手动创建"

    print_success "后端配置完成"
}

# 配置前端
setup_frontend() {
    print_info "配置前端..."

    cd "$PROJECT_DIR/frontend"

    # 安装依赖
    print_info "安装前端依赖..."
    npm install

    # 构建前端
    print_info "构建前端..."
    npm run build

    # 复制构建产物
    cp -r dist/* "$PROJECT_DIR/frontend/" 2>/dev/null || true

    print_success "前端配置完成"
}

# 配置 PM2
setup_pm2() {
    print_info "配置 PM2..."

    # 安装 PM2
    npm install -g pm2

    # 创建 ecosystem 配置
    cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'carparts-api',
    script: 'dist/main.js',
    cwd: '$PROJECT_DIR/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT,
    },
    max_memory_restart: '2G',
    error_file: '$PROJECT_DIR/logs/error.log',
    out_file: '$PROJECT_DIR/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    node_args: '--max-old-space-size=2048',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
EOF

    # 启动服务
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.js
    pm2 save

    # 设置开机自启
    pm2 startup systemd -u root --hp /root

    print_success "PM2 配置完成"
}

# 配置 Nginx
setup_nginx() {
    print_info "配置 Nginx..."

    # 创建 Nginx 配置
    if [ -n "$DOMAIN" ]; then
        # 使用域名
        cat > /etc/nginx/sites-available/carparts << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 重定向到 HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL 配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # 前端静态文件
    root $PROJECT_DIR/frontend;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 600s;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # 上传文件
    location /uploads/ {
        alias $PROJECT_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 文件上传大小限制
    client_max_body_size 50M;
}
EOF
    else
        # 使用 IP
        cat > /etc/nginx/sites-available/carparts << EOF
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root $PROJECT_DIR/frontend;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 600s;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # 上传文件
    location /uploads/ {
        alias $PROJECT_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 文件上传大小限制
    client_max_body_size 50M;
}
EOF
    fi

    # 启用配置
    ln -sf /etc/nginx/sites-available/carparts /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # 测试配置
    nginx -t

    # 重启 Nginx
    systemctl restart nginx

    print_success "Nginx 配置完成"
}

# 配置防火墙
setup_firewall() {
    print_info "配置防火墙..."

    # 检查是否安装了 ufw
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw --force enable
        print_success "防火墙配置完成"
    else
        print_warning "未检测到 ufw，请手动配置防火墙"
    fi
}

# 配置 SSL（可选）
setup_ssl() {
    if [ -z "$DOMAIN" ]; then
        return
    fi

    read -p "是否配置 SSL 证书？(y/n): " setup_ssl_confirm
    if [ "$setup_ssl_confirm" != "y" && "$setup_ssl_confirm" != "Y" ]; then
        return
    fi

    print_info "配置 SSL 证书..."

    # 安装 Certbot
    apt-get install -y certbot python3-certbot-nginx

    # 获取证书
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

    # 设置自动续期
    echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | tee -a /etc/crontab > /dev/null

    print_success "SSL 证书配置完成"
}

# 创建管理脚本
create_management_script() {
    print_info "创建管理脚本..."

    cat > /usr/local/bin/carparts << 'EOF'
#!/bin/bash

# CarParts 管理脚本

case "$1" in
    start)
        cd /www/wwwroot/carparts
        pm2 start ecosystem.config.js
        echo "CarParts 已启动"
        ;;
    stop)
        pm2 stop carparts-api
        echo "CarParts 已停止"
        ;;
    restart)
        pm2 restart carparts-api
        echo "CarParts 已重启"
        ;;
    status)
        pm2 status
        ;;
    logs)
        pm2 logs carparts-api
        ;;
    backup)
        cd /www/wwwroot/carparts
        BACKUP_FILE="backups/carparts_$(date +%Y%m%d_%H%M%S).sql"
        PGPASSWORD="$(grep DB_PASSWORD backend/.env | cut -d'=' -f2)" pg_dump -h 127.0.0.1 -U carparts -d carparts -f "$BACKUP_FILE"
        echo "备份完成: $BACKUP_FILE"
        ;;
    update)
        cd /www/wwwroot/carparts
        git pull origin main
        cd backend && npm run build
        cd ../frontend && npm run build
        cp -r dist/* /www/wwwroot/carparts/frontend/
        pm2 restart carparts-api
        echo "更新完成"
        ;;
    *)
        echo "用法: carparts {start|stop|restart|status|logs|backup|update}"
        exit 1
        ;;
esac
EOF

    chmod +x /usr/local/bin/carparts

    print_success "管理脚本创建完成"
}

# 显示安装结果
show_result() {
    echo ""
    echo "=========================================="
    echo "  CarParts B2B 安装完成！"
    echo "=========================================="
    echo ""

    if [ -n "$DOMAIN" ]; then
        echo "访问地址: http://$DOMAIN"
        echo "HTTPS 地址: https://$DOMAIN"
    else
        SERVER_IP=$(hostname -I | awk '{print $1}')
        echo "访问地址: http://$SERVER_IP"
    fi

    echo ""
    echo "管理员账号: admin"
    echo "管理员密码: $ADMIN_PASSWORD"
    echo ""
    echo "数据库信息:"
    echo "  主机: 127.0.0.1"
    echo "  端口: 5432"
    echo "  用户: carparts"
    echo "  密码: $DB_PASSWORD"
    echo "  数据库: carparts"
    echo ""
    echo "项目目录: $PROJECT_DIR"
    echo ""
    echo "管理命令:"
    echo "  carparts start    - 启动服务"
    echo "  carparts stop     - 停止服务"
    echo "  carparts restart  - 重启服务"
    echo "  carparts status   - 查看状态"
    echo "  carparts logs     - 查看日志"
    echo "  carparts backup   - 备份数据库"
    echo "  carparts update   - 更新代码"
    echo ""
    echo "=========================================="
    echo ""

    # 保存配置信息
    cat > "$PROJECT_DIR/deploy-info.txt" << EOF
CarParts B2B 部署信息
====================

部署时间: $(date)
域名: ${DOMAIN:-无}
服务器 IP: $(hostname -I | awk '{print $1}')

管理员账号: admin
管理员密码: $ADMIN_PASSWORD

数据库信息:
  主机: 127.0.0.1
  端口: 5432
  用户: carparts
  密码: $DB_PASSWORD
  数据库: carparts

JWT 密钥: $JWT_SECRET

项目目录: $PROJECT_DIR
EOF

    print_success "配置信息已保存到: $PROJECT_DIR/deploy-info.txt"
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  CarParts B2B 一键部署脚本"
    echo "=========================================="
    echo ""

    check_root
    check_system
    get_user_input
    update_system
    install_dependencies
    install_nodejs
    install_postgresql
    install_nginx
    create_project_dir
    download_project
    setup_backend
    setup_frontend
    setup_pm2
    setup_nginx
    setup_firewall
    setup_ssl
    create_management_script
    show_result
}

# 运行主函数
main
