#!/bin/bash
# CarParts B2B 权限修复脚本
# 用法: sudo bash fix-permissions.sh

# 网站根目录（请根据实际情况修改）
SITE_DIR="/www/wwwroot/43.161.247.114"

echo "=========================================="
echo "  CarParts B2B 权限修复"
echo "=========================================="

# 1. 创建必要的目录
echo "创建目录..."
mkdir -p "$SITE_DIR/public/uploads"
mkdir -p "$SITE_DIR/public/uploads/images"
mkdir -p "$SITE_DIR/public/uploads/thumbnails"

# 2. 修复权限（宝塔用户是 www）
echo "修复权限..."
chown -R www:www "$SITE_DIR"
chmod -R 755 "$SITE_DIR"
chmod -R 777 "$SITE_DIR/public/uploads"
chmod -R 777 "$SITE_DIR/config"
chmod 777 "$SITE_DIR"

# 3. 创建 .installed 文件（如果不存在）
if [ ! -f "$SITE_DIR/.installed" ]; then
    echo "创建安装标记..."
    echo "$(date)" > "$SITE_DIR/.installed"
    chmod 644 "$SITE_DIR/.installed"
fi

echo ""
echo "=========================================="
echo "  修复完成！"
echo "=========================================="
echo ""
echo "请在宝塔面板中配置 Nginx 伪静态："
echo "1. 网站 → 设置 → 伪静态"
echo "2. 选择 Laravel"
echo "3. 保存"
echo ""
echo "然后访问: http://你的IP/"
echo "=========================================="
