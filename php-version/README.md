# CarParts B2B - PHP 版本

## 快速部署（宝塔面板）

### 1. 上传文件

将所有文件上传到网站根目录

### 2. 设置运行目录

在宝塔面板中：
- 网站 → 设置 → 网站目录
- **运行目录** 改为 `/public`
- 保存

### 3. 配置伪静态

在宝塔面板中：
- 网站 → 设置 → 伪静态
- 选择 **Laravel**
- 保存

### 4. 修复权限

SSH 登录服务器执行：

```bash
# 创建 uploads 目录
mkdir -p /www/wwwroot/你的IP/public/uploads

# 修复权限
chmod 777 /www/wwwroot/你的IP/
chmod -R 777 /www/wwwroot/your-ip/public/uploads
chmod -R 777 /www/wwwroot/your-ip/config
```

或者运行修复脚本：

```bash
chmod +x fix-permissions.sh
sudo bash fix-permissions.sh
```

### 5. 安装

访问 `http://你的IP/` 会自动跳转到安装页面

### 6. 登录

- 用户名：admin
- 密码：安装时设置的密码

---

## 目录结构

```
├── app/                    # 应用代码
│   └── Controllers/        # 控制器
├── config/                 # 配置文件
├── database/               # 数据库迁移
├── public/                 # 网站根目录
│   ├── assets/             # 前端资源
│   ├── uploads/            # 上传文件
│   ├── .htaccess           # Apache 重写规则
│   ├── index.html          # 前端入口
│   └── index.php           # 后端入口
├── routes/                 # 路由定义
├── install.php             # 安装脚本
└── fix-permissions.sh      # 权限修复脚本
```

## Nginx 配置（手动）

如果伪静态不生效，手动添加 Nginx 配置：

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

## 功能

- ✅ 配件管理
- ✅ 库存管理
- ✅ 订单管理
- ✅ 客户管理
- ✅ 供应商管理
- ✅ 报价单管理
- ✅ 素材管理
- ✅ 待办事项
- ✅ 系统设置
- ✅ 百度翻译
- ✅ 系统监控

## 环境要求

- PHP 8.0+
- MySQL 5.7+
- Apache/Nginx
- PHP 扩展：pdo, pdo_mysql, json, mbstring, curl, openssl
