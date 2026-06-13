#!/bin/bash
# CarParts B2B 一键部署脚本
# 版本: 1.0.0
# 作者: buchitanshuibuxing

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 项目配置
CARPARTS_DIR="/opt/carparts"
GITHUB_REPO="https://github.com/buchitanshuibuxing/carparts-b2b.git"
NODE_VERSION="18"
DB_NAME="carparts"
DB_USER="carparts"

# 显示标题
show_header() {
    clear
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  CarParts B2B 一键部署脚本${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/centos-release ]; then
        OS="centos"
    else
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    fi
    echo -e "操作系统: ${CYAN}$OS $OS_VERSION${NC}"
}

# 检测是否已安装
check_installed() {
    if [ -d "$CARPARTS_DIR" ]; then
        echo -e "${YELLOW}检测到 CarParts B2B 已安装！${NC}"
        echo -e "安装目录: $CARPARTS_DIR"
        echo ""
        read -p "是否重新安装？(y/n): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo -e "${YELLOW}已取消安装${NC}"
            exit 0
        fi
    fi
}

# 收集用户输入
collect_input() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  配置信息${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""

    # 域名
    read -p "请输入域名 (如 example.com，留空使用IP): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        DOMAIN=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
        echo -e "使用IP访问: ${CYAN}$DOMAIN${NC}"
    fi

    # 管理员密码
    while true; do
        read -s -p "请输入管理员密码 (至少6位): " ADMIN_PASSWORD
        echo ""
        if [ ${#ADMIN_PASSWORD} -ge 6 ]; then
            break
        fi
        echo -e "${RED}密码长度不能少于6位！${NC}"
    done

    # 数据库密码
    read -s -p "请输入数据库密码 (留空自动生成): " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+' | head -c 16)
        echo -e "已生成数据库密码: ${CYAN}$DB_PASSWORD${NC}"
        echo -e "${YELLOW}请记住此密码！${NC}"
    fi

    # JWT密钥
    JWT_SECRET=$(openssl rand -base64 32 | tr -d '=/+' | head -c 32)

    # 是否启用HTTPS
    echo ""
    read -p "是否启用HTTPS？(y/n，默认y): " ENABLE_SSL
    ENABLE_SSL=${ENABLE_SSL:-y}

    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  配置确认${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "域名: ${GREEN}$DOMAIN${NC}"
    echo -e "HTTPS: ${GREEN}$ENABLE_SSL${NC}"
    echo -e "安装目录: ${GREEN}$CARPARTS_DIR${NC}"
    echo ""
    read -p "确认安装？(y/n): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${YELLOW}已取消安装${NC}"
        exit 0
    fi
}

# 安装Node.js
install_nodejs() {
    echo -e "\n${YELLOW}[1/8] 检查 Node.js...${NC}"

    if command -v node &> /dev/null; then
        NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VER" -ge "$NODE_VERSION" ]; then
            echo -e "${GREEN}✓ Node.js $(node -v) 已安装${NC}"
            return
        fi
    fi

    echo -e "${YELLOW}正在安装 Node.js $NODE_VERSION...${NC}"

    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo yum install -y nodejs
            ;;
        *)
            echo -e "${RED}不支持的操作系统，请手动安装 Node.js $NODE_VERSION${NC}"
            exit 1
            ;;
    esac

    echo -e "${GREEN}✓ Node.js $(node -v) 安装完成${NC}"
}

# 安装PostgreSQL
install_postgresql() {
    echo -e "\n${YELLOW}[2/8] 检查 PostgreSQL...${NC}"

    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL 已安装${NC}"
        return
    fi

    echo -e "${YELLOW}正在安装 PostgreSQL...${NC}"

    case $OS in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        centos|rhel|fedora)
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup --initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
    esac

    echo -e "${GREEN}✓ PostgreSQL 安装完成${NC}"
}

# 安装Nginx
install_nginx() {
    echo -e "\n${YELLOW}[3/8] 检查 Nginx...${NC}"

    if command -v nginx &> /dev/null; then
        echo -e "${GREEN}✓ Nginx 已安装${NC}"
        return
    fi

    echo -e "${YELLOW}正在安装 Nginx...${NC}"

    case $OS in
        ubuntu|debian)
            sudo apt-get install -y nginx
            ;;
        centos|rhel|fedora)
            sudo yum install -y nginx
            ;;
    esac

    sudo systemctl start nginx
    sudo systemctl enable nginx

    echo -e "${GREEN}✓ Nginx 安装完成${NC}"
}

# 安装PM2
install_pm2() {
    echo -e "\n${YELLOW}[4/8] 检查 PM2...${NC}"

    if command -v pm2 &> /dev/null; then
        echo -e "${GREEN}✓ PM2 已安装${NC}"
        return
    fi

    echo -e "${YELLOW}正在安装 PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装完成${NC}"
}

# 下载项目代码
download_project() {
    echo -e "\n${YELLOW}[5/8] 下载项目代码...${NC}"

    if [ -d "$CARPARTS_DIR/.git" ]; then
        echo -e "${YELLOW}更新现有代码...${NC}"
        cd "$CARPARTS_DIR"
        git pull
    else
        echo -e "${YELLOW}克隆项目...${NC}"
        sudo mkdir -p "$CARPARTS_DIR"
        sudo chown -R $USER:$USER "$CARPARTS_DIR"
        git clone "$GITHUB_REPO" "$CARPARTS_DIR"
    fi

    echo -e "${GREEN}✓ 项目代码下载完成${NC}"
}

# 配置数据库
setup_database() {
    echo -e "\n${YELLOW}[6/8] 配置数据库...${NC}"

    # 创建数据库用户
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

    # 创建数据库
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true

    # 授权
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

    # 导入表结构
    if [ -f "$CARPARTS_DIR/backend/src/database/migrations/001_initial_schema.sql" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$CARPARTS_DIR/backend/src/database/migrations/001_initial_schema.sql" 2>/dev/null || true
    fi

    # 创建管理员账户（在后端目录执行，因为需要bcrypt模块）
    cd "$CARPARTS_DIR/backend"
    ADMIN_HASH=$(node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 10))" 2>/dev/null || echo "")

    if [ -z "$ADMIN_HASH" ]; then
        echo -e "${YELLOW}警告: 无法生成密码哈希，跳过创建管理员账户${NC}"
        echo -e "${YELLOW}请在后端安装依赖后手动创建管理员账户${NC}"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO users (username, email, password_hash, display_name, role, is_active)
            VALUES ('admin', 'admin@example.com', '$ADMIN_HASH', '管理员', 'admin', true)
            ON CONFLICT (username) DO UPDATE SET password_hash = '$ADMIN_HASH';
        " 2>/dev/null || true
    fi

    # 初始化角色权限
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete)
        VALUES
            ('admin', 'parts', true, true, true, true),
            ('admin', 'inventory', true, true, true, true),
            ('admin', 'orders', true, true, true, true),
            ('admin', 'customers', true, true, true, true),
            ('admin', 'suppliers', true, true, true, true),
            ('admin', 'quotations', true, true, true, true),
            ('admin', 'prices', true, true, true, true),
            ('admin', 'assets', true, true, true, true),
            ('admin', 'users', true, true, true, true),
            ('admin', 'settings', true, true, true, true),
            ('manager', 'parts', true, true, true, true),
            ('manager', 'inventory', true, true, true, true),
            ('manager', 'orders', true, true, true, true),
            ('manager', 'customers', true, true, true, true),
            ('manager', 'suppliers', true, true, true, true),
            ('manager', 'quotations', true, true, true, true),
            ('manager', 'prices', true, true, true, true),
            ('manager', 'assets', true, true, true, true),
            ('manager', 'users', true, false, false, false),
            ('manager', 'settings', true, false, false, false),
            ('operator', 'parts', true, true, true, false),
            ('operator', 'inventory', true, true, true, false),
            ('operator', 'orders', true, true, true, false),
            ('operator', 'customers', true, true, true, false),
            ('operator', 'suppliers', true, true, true, false),
            ('operator', 'quotations', true, true, true, false),
            ('operator', 'prices', true, true, true, false),
            ('operator', 'assets', true, true, true, false),
            ('operator', 'users', false, false, false, false),
            ('operator', 'settings', false, false, false, false),
            ('viewer', 'parts', true, false, false, false),
            ('viewer', 'inventory', true, false, false, false),
            ('viewer', 'orders', true, false, false, false),
            ('viewer', 'customers', true, false, false, false),
            ('viewer', 'suppliers', true, false, false, false),
            ('viewer', 'quotations', true, false, false, false),
            ('viewer', 'prices', true, false, false, false),
            ('viewer', 'assets', true, false, false, false),
            ('viewer', 'users', false, false, false, false),
            ('viewer', 'settings', false, false, false, false)
        ON CONFLICT (role, module) DO NOTHING;
    " 2>/dev/null || true

    echo -e "${GREEN}✓ 数据库配置完成${NC}"
}

# 配置后端
setup_backend() {
    echo -e "\n${YELLOW}[7/8] 配置后端...${NC}"

    cd "$CARPARTS_DIR/backend"

    # 创建环境变量文件
    cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
UPLOAD_DEST=$CARPARTS_DIR/uploads
MAX_FILE_SIZE=10485760
ALLOWED_ORIGINS=https://$DOMAIN
EOF

    # 安装依赖（包含bcrypt用于密码哈希）
    npm install

    # 构建
    npm run build

    # 创建上传目录
    mkdir -p "$CARPARTS_DIR/uploads"
    mkdir -p "$CARPARTS_DIR/logs"
    mkdir -p "$CARPARTS_DIR/backups"

    # 配置PM2
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'carparts-api',
    script: 'dist/main.js',
    cwd: '$CARPARTS_DIR/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

    # 启动后端
    pm2 start ecosystem.config.js
    pm2 save

    echo -e "${GREEN}✓ 后端配置完成${NC}"
}

# 配置前端和Nginx
setup_frontend_nginx() {
    echo -e "\n${YELLOW}[8/8] 配置前端和Nginx...${NC}"

    # 构建前端
    cd "$CARPARTS_DIR/frontend"
    npm install
    npm run build

    # 配置Nginx
    if [ "$ENABLE_SSL" = "y" ] || [ "$ENABLE_SSL" = "Y" ]; then
        # HTTPS配置
        sudo tee /etc/nginx/sites-available/carparts > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL配置将由certbot添加

    root $CARPARTS_DIR/frontend/dist;
    index index.html;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 上传文件
    location /uploads/ {
        alias $CARPARTS_DIR/uploads/;
        expires 30d;
    }

    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 60s;
    }

    # SPA路由
    location / {
        try_files \$uri /index.html;
    }
}
EOF
    else
        # HTTP配置
        sudo tee /etc/nginx/sites-available/carparts > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    root $CARPARTS_DIR/frontend/dist;
    index index.html;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 上传文件
    location /uploads/ {
        alias $CARPARTS_DIR/uploads/;
        expires 30d;
    }

    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # SPA路由
    location / {
        try_files \$uri /index.html;
    }
}
EOF
    fi

    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/carparts /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # 测试并重启Nginx
    sudo nginx -t && sudo systemctl restart nginx

    echo -e "${GREEN}✓ 前端和Nginx配置完成${NC}"
}

# 配置SSL证书
setup_ssl() {
    if [ "$ENABLE_SSL" != "y" ] && [ "$ENABLE_SSL" != "Y" ]; then
        return
    fi

    if [ "$DOMAIN" = "localhost" ] || [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${YELLOW}IP地址无法申请SSL证书，跳过${NC}"
        return
    fi

    echo -e "\n${YELLOW}正在申请SSL证书...${NC}"

    # 安装certbot
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y certbot python3-certbot-nginx
            ;;
        centos|rhel|fedora)
            sudo yum install -y certbot python3-certbot-nginx
            ;;
    esac

    # 申请证书
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || true

    echo -e "${GREEN}✓ SSL证书配置完成${NC}"
}

# 安装管理命令
install_command() {
    echo -e "\n${YELLOW}安装管理命令...${NC}"

    # 复制管理脚本
    sudo cp "$CARPARTS_DIR/deploy/carparts" /usr/local/bin/carparts
    sudo chmod +x /usr/local/bin/carparts

    echo -e "${GREEN}✓ 管理命令安装完成${NC}"
}

# 显示安装结果
show_result() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  🎉 安装完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址: ${CYAN}https://$DOMAIN${NC}"
    echo -e "管理员账号: ${CYAN}admin${NC}"
    echo -e "管理员密码: ${CYAN}$ADMIN_PASSWORD${NC}"
    echo ""
    echo -e "数据库名称: ${CYAN}$DB_NAME${NC}"
    echo -e "数据库用户: ${CYAN}$DB_USER${NC}"
    echo -e "数据库密码: ${CYAN}$DB_PASSWORD${NC}"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo -e "  启动管理面板: ${CYAN}carparts${NC}"
    echo -e "  启动服务: ${CYAN}carparts start${NC}"
    echo -e "  停止服务: ${CYAN}carparts stop${NC}"
    echo -e "  重启服务: ${CYAN}carparts restart${NC}"
    echo -e "  查看状态: ${CYAN}carparts status${NC}"
    echo -e "  备份数据库: ${CYAN}carparts backup${NC}"
    echo ""
    echo -e "${YELLOW}请保存好以上信息！${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# 主安装流程
main() {
    show_header
    detect_os
    check_installed
    collect_input

    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}  开始安装${NC}"
    echo -e "${CYAN}========================================${NC}"

    install_nodejs
    install_postgresql
    install_nginx
    install_pm2
    download_project
    setup_backend        # 先安装后端依赖
    setup_database       # 再配置数据库（需要bcrypt模块）
    setup_frontend_nginx
    setup_ssl
    install_command
    show_result
}

# 运行主程序
main
