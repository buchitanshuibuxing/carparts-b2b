# CarParts B2B - PHP 版本

## 快速部署（宝塔面板）

### 1. 上传文件
将 `php-version` 目录中的所有文件上传到网站根目录

### 2. 配置网站
在宝塔面板中：
- 创建网站
- 设置运行目录为 `/public`
- PHP 版本选择 8.0+

### 3. 配置数据库
在宝塔面板中：
- 创建 MySQL 数据库
- 记录数据库名、用户名、密码

### 4. 运行安装
访问 `http://your-domain/install.php`
- 输入数据库信息
- 设置管理员账号
- 点击安装

### 5. 完成
安装完成后访问 `http://your-domain` 即可使用

## 目录结构

```
php-version/
├── app/
│   ├── Controllers/     # 控制器
│   ├── Models/          # 模型
│   ├── Services/        # 服务
│   └── Database.php     # 数据库连接
├── config/
│   ├── app.php          # 应用配置
│   └── database.php     # 数据库配置
├── database/
│   └── migrations/      # 数据库迁移
├── public/
│   ├── assets/          # 前端资源
│   ├── uploads/         # 上传文件
│   ├── .htaccess        # URL 重写
│   └── index.php        # 入口文件
├── resources/
│   └── views/           # 视图模板
├── routes/
│   └── api.php          # API 路由
└── install.php          # 安装脚本
```

## 环境要求

- PHP 8.0+
- MySQL 5.7+
- Apache/Nginx
- PHP 扩展：pdo, pdo_mysql, json, mbstring, curl, openssl

## 默认账号

- 用户名：admin
- 密码：admin123

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
