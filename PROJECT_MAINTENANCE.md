# CarParts B2B 项目维护文档

> 最后更新：2026-06-19
> 本文档记录项目的关键信息、修复历史和维护指南

---

## 📋 项目概述

- **项目名称**：CarParts B2B 汽车配件管理系统
- **技术栈**：React 19 + TypeScript + NestJS + PostgreSQL
- **本地路径**：`/Users/zfbimac/Desktop/car parts b2b/`
- **GitHub**：https://github.com/buchitanshuibuxing/carparts-b2b

---

## 🖥️ 服务器信息

| 项目 | 值 |
|------|-----|
| 地址 | nas.xiazhou.top |
| SSH 端口 | 9522 |
| 用户名 | zfb |
| 密码 | zfb0411! |
| 项目路径 | /www/wwwroot/carparts/ |
| 后端路径 | /www/wwwroot/carparts/backend/ |
| 前端路径 | /www/wwwroot/carparts/frontend/ |
| 上传目录 | /www/wwwroot/carparts/uploads/ |

### 数据库信息

| 项目 | 值 |
|------|-----|
| 类型 | PostgreSQL |
| 主机 | 127.0.0.1 |
| 端口 | 5432 |
| 用户 | postgres |
| 密码 | Cp.123456 |
| 数据库 | carparts |

### 服务管理

| 服务 | 命令 |
|------|------|
| PM2 状态 | `pm2 status` |
| PM2 重启 | `pm2 restart carparts-api` |
| PM2 日志 | `pm2 logs carparts-api` |
| PostgreSQL 重启 | `sudo -u postgres /www/server/pgsql/bin/pg_ctl -D /www/server/pgsql/data restart` |

---

## 🔧 常用操作

### 部署后端

```bash
# 1. 同步文件
sshpass -p 'zfb0411!' rsync -avz -e "ssh -p 9522 -o StrictHostKeyChecking=no" \
  "/Users/zfbimac/Desktop/car parts b2b/backend/src/xxx" \
  zfb@nas.xiazhou.top:/tmp/xxx/

# 2. 复制到项目目录
sshpass -p 'zfb0411!' ssh -p 9522 -o StrictHostKeyChecking=no zfb@nas.xiazhou.top "
echo 'zfb0411!' | sudo -S cp /tmp/xxx/* /www/wwwroot/carparts/backend/src/xxx/
echo 'zfb0411!' | sudo -S chown -R www:www /www/wwwroot/carparts/backend/src/xxx/
echo 'zfb0411!' | sudo -S bash -c 'cd /www/wwwroot/carparts/backend && npm run build 2>&1 | tail -5'
pm2 restart carparts-api
"
```

### 部署前端

```bash
# 1. 本地构建
cd "/Users/zfbimac/Desktop/car parts b2b/frontend"
npm run build

# 2. 同步到服务器
sshpass -p 'zfb0411!' rsync -avz --delete -e "ssh -p 9522 -o StrictHostKeyChecking=no" \
  "/Users/zfbimac/Desktop/car parts b2b/frontend/dist/" \
  zfb@nas.xiazhou.top:/tmp/frontend-dist/

# 3. 复制到项目目录
sshpass -p 'zfb0411!' ssh -p 9522 -o StrictHostKeyChecking=no zfb@nas.xiazhou.top "
echo 'zfb0411!' | sudo -S cp -r /tmp/frontend-dist/* /www/wwwroot/carparts/frontend/
echo 'zfb0411!' | sudo -S chown -R www:www /www/wwwroot/carparts/frontend/
"
```

### 数据库操作

```bash
# 连接数据库
sshpass -p 'zfb0411!' ssh -p 9522 -o StrictHostKeyChecking=no zfb@nas.xiazhou.top \
  "PGPASSWORD='Cp.123456' psql -h 127.0.0.1 -U postgres -d carparts"

# 执行 SQL
sshpass -p 'zfb0411!' ssh -p 9522 -o StrictHostKeyChecking=no zfb@nas.xiazhou.top \
  "PGPASSWORD='Cp.123456' psql -h 127.0.0.1 -U postgres -d carparts -c \"SELECT * FROM users;\""
```

---

## 📝 修复历史

### 2026-06-19

#### 1. 设置上传分离
- **问题**：设置中上传的网站图标显示在素材库中
- **修复**：新增 `/settings/upload` 接口，文件保存到 `uploads/settings/` 目录
- **文件**：
  - `backend/src/settings/settings.controller.ts`
  - `backend/src/settings/settings.service.ts`
  - `backend/src/settings/settings.module.ts`
  - `frontend/src/pages/Settings.tsx`

#### 2. 性能优化
- **PostgreSQL**：
  - shared_buffers: 128MB → 8GB
  - effective_cache_size: 4GB → 16GB
  - work_mem: 32MB → 64MB
  - max_connections: 100 → 200
  - max_parallel_workers: 8 → 16
- **TypeORM**：添加连接池配置 (max=20, min=5)
- **PM2**：内存限制 512MB → 2GB

#### 3. Admin 密码重置
- **原因**：PostgreSQL 重启后共享内存段丢失
- **修复**：重启 PostgreSQL，重置 admin 密码为 `admin123`

### 2026-06-18

#### P0 修复（严重）
1. **装饰器位置修复**
   - `customers.controller.ts`：@RequirePermission 移到方法之前
   - `suppliers.controller.ts`：同上
   - `quotations.controller.ts`：两处修复
   - `prices.controller.ts`：同上

2. **execSync 安全加固**
   - `system.service.ts`：lines 参数限制最大 500 行

#### P1 修复（高风险）
1. **登录速率限制**
   - `auth.service.ts`：5分钟内最多5次尝试

2. **端点权限装饰器**
   - `orders.controller.ts`：8个端点补充权限
   - `customers.controller.ts`：6个端点补充权限
   - `inventory.controller.ts`：6个端点补充权限

#### P2 修复（中等风险）
1. **getStats 查询优化**
   - `orders.service.ts`：8次查询合并为1条SQL

2. **异常过滤器记录错误**
   - `http-exception.filter.ts`：添加 Logger 记录

3. **Mass Assignment 修复**
   - `customers.service.ts`：白名单字段验证
   - `suppliers.service.ts`：同上

#### P3 修复（低风险）
1. **日志路径改为环境变量**
2. **登录日志空 catch 修复**
3. **Todos 用户归属**
4. **Todos 分页限制**
5. **AbortController 清理**
6. **内联 style 移至 CSS**

---

## 🗄️ 数据库表结构

### 核心表

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| parts | 配件表 |
| inventory | 库存表 |
| orders | 订单表 |
| order_items | 订单明细表 |
| customers | 客户表 |
| suppliers | 供应商表 |
| quotations | 报价单表 |
| quotation_items | 报价单明细表 |
| settings | 系统设置表 |
| todos | 待办事项表 |
| image_assets | 素材表 |
| prices | 价格表 |

### 新增表（本次修复）

| 表名 | 说明 | 迁移文件 |
|------|------|----------|
| todos | 待办事项 | 007_create_todos.sql |
| todos (user_id) | 用户归属 | 007_add_todo_user_id.sql |

---

## 🔐 权限系统

### 角色

| 角色 | 说明 |
|------|------|
| admin | 管理员，拥有所有权限 |
| operator | 操作员，大部分功能权限 |
| viewer | 只读用户 |

### 权限检查

- 使用 `@RequirePermission(module, action)` 装饰器
- 模块：parts, inventory, orders, customers, suppliers, quotations, prices, assets, settings
- 动作：view, create, edit, delete

---

## 🚀 API 端点

### 认证
- `POST /api/auth/login` - 登录（有速率限制）
- `POST /api/auth/refresh` - 刷新 token
- `GET /api/auth/me` - 获取当前用户

### 待办事项
- `GET /api/todos` - 获取待办（按用户隔离）
- `POST /api/todos` - 创建待办
- `PATCH /api/todos/:id` - 更新待办
- `DELETE /api/todos/:id` - 删除待办

### 系统管理
- `GET /api/system/health` - 健康检查
- `POST /api/system/restart` - 重启后端
- `GET /api/system/logs` - 获取日志
- `POST /api/system/logs/clear` - 清理日志

### 设置
- `GET /api/settings` - 获取设置
- `PUT /api/settings/:key` - 更新设置
- `POST /api/settings/upload` - 上传文件（不保存到素材库）
- `POST /api/settings/test-connection/:type` - 测试连接

---

## ⚠️ 注意事项

### Cluster 模式问题
- **不要使用 PM2 cluster 模式**
- 原因：应用使用 WebSocket（socket.io），cluster 模式会导致连接问题
- 当前配置：fork 模式，单实例

### 文件权限
- PM2 以 `zfb` 用户运行
- 上传目录需要 `zfb` 用户有写入权限
- 命令：`sudo chown -R zfb:zfb /www/wwwroot/carparts/uploads/`

### PostgreSQL 重启
- 不能用 root 用户重启
- 命令：`sudo -u postgres /www/server/pgsql/bin/pg_ctl -D /www/server/pgsql/data restart`
- 部分配置（shared_buffers, max_connections）需要重启才能生效

---

## 📊 Git 还原点

```bash
# 查看还原点
cd "/Users/zfbimac/Desktop/car parts b2b"
git log --oneline

# 恢复到某个还原点
git checkout <commit-id>

# 恢复全部文件
git checkout .

# 恢复单个文件
git checkout <file-path>
```

### 还原点列表

| Commit ID | 说明 | 时间 |
|-----------|------|------|
| c7ced9a | 修复设置上传分离 + 性能优化 | 2026-06-19 12:50 |
| 5e11705 | 修复P3问题 | 2026-06-18 17:30 |
| 543e55d | 修复P2-3/P2-4 | 2026-06-18 17:22 |
| ef204f6 | 修复P2-2 | 2026-06-18 17:17 |
| 13f2c2b | 修复P2-1 | 2026-06-18 17:14 |
| e482ed2 | 修复P1问题 | 2026-06-18 17:10 |
| 8c9c4f9 | 修复P0问题 | 2026-06-18 17:02 |
| ea35b0e | 服务器同步后 | 2026-06-18 16:55 |
| 93288e4 | 修复P0问题前 | 2026-06-18 16:52 |

---

## 📞 快速联系

- **服务器**：`ssh -p 9522 zfb@nas.xiazhou.top`
- **数据库**：`PGPASSWORD='Cp.123456' psql -h 127.0.0.1 -U postgres -d carparts`
- **PM2 日志**：`pm2 logs carparts-api`
- **后端日志**：`/home/zfb/.pm2/logs/carparts-api-out.log`
- **错误日志**：`/home/zfb/.pm2/logs/carparts-api-error.log`

---

## 🔄 后续待办

### 待优化（风险较高，暂不处理）
- [ ] 响应格式统一（前端已适配当前格式）
- [ ] refresh token 使用不同密钥
- [ ] Quotations generate 端点拆分
- [ ] 批量操作使用批量 SQL
- [ ] 前端 any 类型定义

### 建议
- [ ] 推送代码到 GitHub
- [ ] 配置自动备份
- [ ] 添加监控告警
