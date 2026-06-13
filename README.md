# CarParts B2B 汽车配件管理系统

一个完整的汽车配件B2B管理系统，包含配件管理、库存管理、订单管理、客户管理、报价单、供应商管理等功能。

## ✨ 功能特性

### 核心模块
- 📦 **配件管理** - 配件目录、分类管理、OE编号管理
- 📊 **库存管理** - 库存调整、库存日志、低库存预警
- 🛒 **订单管理** - 创建订单、订单状态跟踪、订单打印
- 👥 **客户管理** - 客户信息、客户分类、客户导入导出
- 💰 **价格管理** - 多级价格、价格历史、批量调价
- 📋 **报价单** - 报价单创建、报价转订单、报价打印
- 🏭 **供应商管理** - 供应商信息、供应商配件关联
- 📸 **素材管理** - 图片上传、批量上传、素材分类
- 📱 **Facebook集成** - 帖子管理、AI文案生成、客户询价

### 系统功能
- 🔐 **权限管理** - 多角色权限控制（管理员/经理/操作员/查看者）
- 📊 **数据统计** - 仪表盘、销售趋势、库存分析
- 📥 **数据导入导出** - Excel批量导入导出
- 🔧 **系统设置** - OCR配置、AI配置、OE查询配置
- 📝 **操作日志** - 登录日志、审计日志

### 技术特性
- 🚀 **一键部署** - Shell脚本一键安装
- 🔒 **安全可靠** - JWT认证、权限控制、数据加密
- 📱 **响应式设计** - 支持PC和移动端
- 🌐 **多语言支持** - 中文/英文/韩文配件名称
- 🔍 **智能搜索** - 配件模糊搜索、拼音搜索

## 🛠️ 技术栈

### 前端
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Zustand (状态管理)
- Axios (HTTP请求)
- Recharts (图表)
- Lucide React (图标)

### 后端
- NestJS (Node.js框架)
- TypeORM (ORM)
- PostgreSQL (数据库)
- JWT (认证)
- Multer (文件上传)

### 部署
- Nginx (反向代理)
- PM2 (进程管理)
- Let's Encrypt (SSL证书)

## 📦 项目结构

```
carparts/
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── stores/         # 状态管理
│   │   ├── hooks/          # 自定义Hook
│   │   ├── lib/            # 工具函数
│   │   └── types/          # TypeScript类型
│   ├── public/
│   └── package.json
├── backend/                # 后端代码
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── users/          # 用户模块
│   │   ├── parts/          # 配件模块
│   │   ├── inventory/      # 库存模块
│   │   ├── orders/         # 订单模块
│   │   ├── customers/      # 客户模块
│   │   ├── suppliers/      # 供应商模块
│   │   ├── quotations/     # 报价单模块
│   │   ├── prices/         # 价格模块
│   │   ├── assets/         # 素材模块
│   │   ├── facebook/       # Facebook模块
│   │   ├── settings/       # 设置模块
│   │   └── common/         # 公共模块
│   └── package.json
└── README.md
```

## 🚀 快速开始

### 一键部署（推荐）

```bash
# 下载安装脚本
curl -sSL https://raw.githubusercontent.com/buchitanshuibuxing/carparts-b2b/main/deploy/install.sh -o install.sh

# 添加执行权限
chmod +x install.sh

# 运行安装
./install.sh
```

安装完成后，使用 `carparts` 命令管理服务：

```bash
carparts  # 打开管理面板
```

### 手动部署

#### 1. 环境要求
- Node.js 18+
- PostgreSQL 14+
- Nginx

#### 2. 安装依赖

```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

#### 3. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库等信息
```

#### 4. 初始化数据库

```bash
cd backend
npm run migration:run
```

#### 5. 构建前端

```bash
cd frontend
npm run build
```

#### 6. 启动服务

```bash
# 后端
cd backend
pm2 start ecosystem.config.js

# 配置Nginx反向代理
```

## 📖 使用说明

### 默认账户
- 用户名: `admin`
- 密码: `admin123`

### 管理命令

```bash
# 启动管理面板
carparts

# 或者使用具体命令
carparts start      # 启动服务
carparts stop       # 停止服务
carparts restart    # 重启服务
carparts status     # 查看状态
carparts backup     # 备份数据库
carparts update     # 更新系统
```

## 📸 界面截图

### 仪表盘
![仪表盘](screenshots/dashboard.png)

### 配件管理
![配件管理](screenshots/parts.png)

### 订单管理
![订单管理](screenshots/orders.png)

## 🔧 配置说明

### 环境变量

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=carparts
DB_PASSWORD=your_password
DB_NAME=carparts

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 上传配置
UPLOAD_DEST=/opt/carparts/uploads
MAX_FILE_SIZE=10485760
```

### Nginx配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /opt/carparts/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📧 联系方式

- 作者: buchitanshuibuxing
- GitHub: https://github.com/buchitanshuibuxing

## 🙏 致谢

感谢所有贡献者和开源社区！

---

如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！
