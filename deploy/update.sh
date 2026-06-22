#!/bin/bash

# ============================================================
# CarParts B2B 更新脚本
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/www/wwwroot/carparts"

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用 root 用户运行此脚本"
        exit 1
    fi
}

# 备份数据库
backup_database() {
    print_info "备份数据库..."

    BACKUP_DIR="$PROJECT_DIR/backups"
    BACKUP_FILE="$BACKUP_DIR/carparts_$(date +%Y%m%d_%H%M%S).sql"

    mkdir -p "$BACKUP_DIR"

    # 从 .env 读取数据库密码
    DB_PASSWORD=$(grep DB_PASSWORD "$PROJECT_DIR/backend/.env" | cut -d'=' -f2)

    PGPASSWORD="$DB_PASSWORD" pg_dump -h 127.0.0.1 -U carparts -d carparts -f "$BACKUP_FILE"

    print_success "数据库备份完成: $BACKUP_FILE"

    # 清理 7 天前的备份
    find "$BACKUP_DIR" -name "carparts_*.sql" -mtime +7 -delete
}

# 更新代码
update_code() {
    print_info "更新代码..."

    cd "$PROJECT_DIR"

    # 拉取最新代码
    git pull origin main

    print_success "代码更新完成"
}

# 更新后端
update_backend() {
    print_info "更新后端..."

    cd "$PROJECT_DIR/backend"

    # 安装依赖
    npm install --production

    # 构建
    npm run build

    print_success "后端更新完成"
}

# 更新前端
update_frontend() {
    print_info "更新前端..."

    cd "$PROJECT_DIR/frontend"

    # 安装依赖
    npm install

    # 构建
    npm run build

    # 复制构建产物
    cp -r dist/* "$PROJECT_DIR/frontend/" 2>/dev/null || true

    print_success "前端更新完成"
}

# 重启服务
restart_service() {
    print_info "重启服务..."

    pm2 restart carparts-api

    print_success "服务重启完成"
}

# 显示更新结果
show_result() {
    echo ""
    echo "=========================================="
    echo "  更新完成！"
    echo "=========================================="
    echo ""
    echo "更新时间: $(date)"
    echo ""
    echo "如需查看日志: pm2 logs carparts-api"
    echo "=========================================="
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  CarParts B2B 更新脚本"
    echo "=========================================="
    echo ""

    check_root
    backup_database
    update_code
    update_backend
    update_frontend
    restart_service
    show_result
}

# 运行主函数
main
