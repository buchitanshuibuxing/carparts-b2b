# Car Parts B2B — 汽车配件管理系统开发手册

> 本文档基于 Tauri 2.0 桌面应用版本整理，用于指导 Web 版移植开发。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈说明](#2-技术栈说明)
3. [项目架构](#3-项目架构)
4. [数据库设计](#4-数据库设计)
5. [API 接口文档](#5-api-接口文档)
6. [前端组件结构](#6-前端组件结构)
7. [业务逻辑说明](#7-业务逻辑说明)
8. [Web 版移植指南](#8-web-版移植指南)

---

## 1. 项目概述

### 1.1 项目简介

| 项目 | 说明 |
|------|------|
| 中文名称 | 汽车配件 B2B 管理系统 |
| 英文名称 | Car Parts B2B Management System |
| 版本 | v1.0.0 |
| 应用类型 | 桌面应用（Tauri 2.0） |
| 目标用户 | 汽车配件贸易商、经销商 |
| 核心目标 | 管理配件库存、供应商、客户、订单及报价 |

### 1.2 核心功能模块

- **配件目录管理**：OE 编号、多语言名称、分类、规格
- **库存管理**：实时库存、入库/出库、低库存预警
- **供应商管理**：供应商信息、关联配件、评级
- **客户管理**：客户信息、信用额度、客户分级
- **价格管理**：阶梯定价、多货币、价格变更历史
- **订单管理**：订单创建、状态流转、订单统计
- **报价管理**：报价模板、生成报价单、导出 PDF
- **数据导入**：Excel 批量导入配件/供应商/客户数据
- **图片管理**：配件图片上传、OCR 识别、主图设置

---

## 2. 技术栈说明

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.1.0 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| TailwindCSS | 4.x | 样式方案 |
| Zustand | latest | 轻量状态管理 |
| Recharts | latest | 图表可视化 |
| React Router DOM | 7.x | 前端路由 |
| Lucide React | latest | 图标库 |
| Vite | latest | 构建工具 |

### 2.2 后端技术栈（当前 Tauri 方案）

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.0 | 桌面应用框架 |
| Rust | edition 2021 | 后端语言 |
| rusqlite | latest | SQLite 访问 |
| chrono | latest | 日期时间处理 |
| calamine | latest | Excel 读取 |
| serde / serde_json | latest | 序列化 |
| image | latest | 图片处理 |

### 2.3 数据库

| 技术 | 版本 | 用途 |
|------|------|------|
| SQLite | 3.x | 本地嵌入式数据库 |
| FTS5 | — | 全文搜索（配件名称） |

### 2.4 Web 版推荐技术栈

| 层级 | 推荐方案 | 说明 |
|------|----------|------|
| 前端 | React 19 + TypeScript + TailwindCSS | 复用现有代码 |
| 后端 API | Node.js (Express/NestJS) 或 Rust (Actix-web/Axum) | 见第 8 章分析 |
| 数据库 | PostgreSQL + Redis | 替代 SQLite，支持多用户 |
| 文件存储 | 对象存储 (S3/OSS) 或本地磁盘 | 替代本地文件路径 |
| 认证 | JWT + Refresh Token | 替代 Tauri 本地信任 |
| 部署 | Docker + Nginx | 容器化部署 |

---

## 3. 项目架构

### 3.1 目录结构

```
tauri/                          # 项目根目录
├── src-tauri/                  # Tauri 后端（Rust）
│   ├── Cargo.toml              # Rust 依赖配置
│   ├── tauri.conf.json         # Tauri 应用配置
│   ├── icons/                  # 应用图标
│   └── src/
│       ├── lib.rs              # Tauri 命令注册入口
│       ├── main.rs             # 应用启动入口
│       ├── db/
│       │   ├── mod.rs          # 数据库模块
│       │   └── connection.rs   # SQLite 连接管理
│       ├── models/              # 数据模型（Rust 结构体）
│       │   ├── common.rs       # 通用分页/响应模型
│       │   ├── part.rs
│       │   ├── inventory.rs
│       │   ├── supplier.rs
│       │   ├── customer.rs
│       │   ├── price.rs
│       │   ├── order.rs
│       │   ├── quotation.rs
│       │   └── image_asset.rs
│       ├── commands/           # Tauri 命令处理函数
│       │   ├── part_commands.rs
│       │   ├── inventory_commands.rs
│       │   ├── supplier_commands.rs
│       │   ├── customer_commands.rs
│       │   ├── price_commands.rs
│       │   ├── order_commands.rs
│       │   ├── quotation_commands.rs
│       │   ├── image_commands.rs
│       │   ├── import_commands.rs
│       │   └── system_commands.rs
│       ├── utils/
│       │   ├── error.rs        # 统一错误处理
│       │   └── fts.rs          # 全文搜索工具
│       └── migrations/         # 数据库迁移脚本
│           ├── 001_initial_schema.sql
│           └── 002_add_fts_triggers.sql
├── src/                        # 前端（React + TypeScript）
│   ├── main.tsx                # 前端入口
│   ├── App.tsx                 # 根组件
│   ├── vite-env.d.ts           # Vite 类型声明
│   ├── lib/
│   │   ├── api.ts              # Tauri invoke 封装（API 层）
│   │   └── constants.ts        # 常量定义
│   ├── types/                  # TypeScript 类型定义
│   │   ├── api.ts             # 通用 API 类型（分页、过滤）
│   │   ├── part.ts
│   │   ├── inventory.ts
│   │   ├── supplier.ts
│   │   ├── customer.ts
│   │   ├── price.ts
│   │   ├── order.ts
│   │   ├── quotation.ts
│   │   ├── image_asset.ts
│   │   └── settings.ts
│   ├── components/             # 可复用 UI 组件
│   │   └── ui/                # 基础组件库
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Card.tsx
│   │       ├── Table.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       ├── Pagination.tsx
│   │       ├── EmptyState.tsx
│   │       └── StatCard.tsx
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard.tsx
│   │   ├── PartsCatalog.tsx
│   │   ├── PartDetail.tsx
│   │   ├── Inventory.tsx
│   │   ├── Suppliers.tsx
│   │   ├── Customers.tsx
│   │   ├── Pricing.tsx
│   │   ├── Orders.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── Quotations.tsx
│   │   ├── ImportData.tsx
│   │   ├── Assets.tsx
│   │   ├── Settings.tsx
│   │   └── NotFound.tsx
│   ├── hooks/                  # 自定义 React Hooks
│   │   ├── usePagination.ts
│   │   └── usePartSearch.ts
│   └── stores/                 # Zustand 状态管理
│       └── (各模块 store)
├── public/                     # 静态资源
├── package.json                # 前端依赖配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # TailwindCSS 配置
└── postcss.config.js           # PostCSS 配置
```

### 3.2 模块划分

```
┌─────────────────────────────────────────────────────┐
│                   前端 (React)                      │
│  Pages → Components → Hooks → Stores → API Layer  │
│                        ↓ invoke()                   │
├─────────────────────────────────────────────────────┤
│              Tauri Bridge (IPC)                    │
├─────────────────────────────────────────────────────┤
│                   Rust 后端                         │
│  Commands → Models → DB Layer → SQLite            │
└─────────────────────────────────────────────────────┘
```

**关键设计特点**：
- 前端通过 `invoke()` 调用 Rust 命令，无需 HTTP 服务
- Rust 后端直接访问本地 SQLite 文件
- 图片存储在本地文件系统（`Documents/CarPartsB2B/images/`）

---

## 4. 数据库设计

### 4.1 完整 ER 关系图（文字描述）

```
parts (1) ─── (N) inventory        # 一个配件有一条库存记录
parts (1) ─── (N) prices          # 一个配件有多个价格档位
parts (1) ─── (N) image_assets    # 一个配件有多张图片
parts (N) ─── (N) suppliers       # 通过 supplier_parts 中间表
orders (1) ─── (N) order_items    # 一个订单有多个订单项
orders (N) ─── (1) customers      # 多个订单属于一个客户
prices (1) ─── (N) price_log      # 一个价格有多条变更记录
quotations (1) ─── (N) quotation_items  # 一个报价单有多条明细
```

### 4.2 表结构详细说明

#### 4.2.1 parts — 配件主数据表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| oe_number | TEXT | NOT NULL, UNIQUE | OE 编号（原厂零件号） |
| part_name_cn | TEXT | NOT NULL | 中文名称 |
| part_name_en | TEXT | DEFAULT '' | 英文名称 |
| part_name_ko | TEXT | DEFAULT '' | 韩文名称 |
| category | TEXT | DEFAULT '其他' | 一级分类 |
| sub_category | TEXT | DEFAULT '' | 二级分类 |
| brand | TEXT | DEFAULT '' | 品牌 |
| car_model | TEXT | DEFAULT '' | 适用车型 |
| engine_type | TEXT | DEFAULT '' | 发动机型号 |
| model_year_from | INTEGER | DEFAULT NULL | 年款起始 |
| model_year_to | INTEGER | DEFAULT NULL | 年款结束 |
| part_type | TEXT | DEFAULT 'OEM' | 配件类型（OEM/Aftermarket） |
| specifications | TEXT | DEFAULT '' | 规格参数（JSON 字符串） |
| unit | TEXT | DEFAULT '个' | 计量单位 |
| weight_kg | REAL | DEFAULT 0 | 重量（kg） |
| dimensions_cm | TEXT | DEFAULT '' | 尺寸（cm，格式：LxWxH） |
| hs_code | TEXT | DEFAULT '' | 海关编码 |
| notes | TEXT | DEFAULT '' | 备注 |
| is_active | INTEGER | DEFAULT 1 | 是否启用（0=停用，1=启用） |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**：
- `CREATE INDEX idx_parts_category ON parts(category);`
- `CREATE INDEX idx_parts_brand ON parts(brand);`
- `CREATE INDEX idx_parts_car_model ON parts(car_model);`
- `CREATE VIRTUAL TABLE parts_fts USING fts5(part_name_cn, part_name_en, oe_number, content='parts', content_rowid='id')`

---

#### 4.2.2 inventory — 库存表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| part_id | INTEGER | NOT NULL, UNIQUE, FK→parts(id) | 关联配件 |
| quantity | INTEGER | DEFAULT 0 | 当前库存数量 |
| reserved_quantity | INTEGER | DEFAULT 0 | 预留数量（已下单未出库） |
| warehouse_location | TEXT | DEFAULT '' | 库位编号 |
| warehouse_zone | TEXT | DEFAULT '默认' | 库区（默认/保税/退货） |
| min_stock | INTEGER | DEFAULT 0 | 最低库存预警线 |
| max_stock | INTEGER | DEFAULT 99999 | 最高库存上限 |
| last_stock_check | TEXT | DEFAULT NULL | 上次盘点时间 |
| last_restock_date | TEXT | DEFAULT NULL | 上次补货时间 |
| notes | TEXT | DEFAULT '' | 备注 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`updated_at` 自动更新触发器

---

#### 4.2.3 suppliers — 供应商表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| supplier_code | TEXT | NOT NULL, UNIQUE | 供应商编号 |
| company_name | TEXT | NOT NULL | 公司名称 |
| contact_person | TEXT | DEFAULT '' | 联系人 |
| phone | TEXT | DEFAULT '' | 电话 |
| email | TEXT | DEFAULT '' | 邮箱 |
| address | TEXT | DEFAULT '' | 地址 |
| country | TEXT | DEFAULT '' | 国家 |
| payment_terms | TEXT | DEFAULT '' | 付款条款 |
| currency | TEXT | DEFAULT 'USD' | 结算货币 |
| lead_time_days | INTEGER | DEFAULT 0 | 交货周期（天） |
| rating | INTEGER | DEFAULT 0 | 评级（0-5） |
| notes | TEXT | DEFAULT '' | 备注 |
| is_active | INTEGER | DEFAULT 1 | 是否合作（0=停用，1=合作） |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

#### 4.2.4 customers — 客户表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| customer_code | TEXT | NOT NULL, UNIQUE | 客户编号 |
| company_name | TEXT | NOT NULL | 公司名称 |
| contact_person | TEXT | DEFAULT '' | 联系人 |
| phone | TEXT | DEFAULT '' | 电话 |
| email | TEXT | DEFAULT '' | 邮箱 |
| address | TEXT | DEFAULT '' | 地址 |
| country | TEXT | DEFAULT '' | 国家 |
| region | TEXT | DEFAULT '' | 地区 |
| customer_type | TEXT | DEFAULT '经销商' | 客户类型 |
| customer_level | TEXT | DEFAULT '普通' | 客户等级（普通/VIP/战略） |
| currency | TEXT | DEFAULT 'USD' | 结算货币 |
| credit_limit | REAL | DEFAULT 0 | 信用额度 |
| payment_terms | TEXT | DEFAULT '' | 付款条款 |
| notes | TEXT | DEFAULT '' | 备注 |
| is_active | INTEGER | DEFAULT 1 | 是否合作 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

#### 4.2.5 orders — 订单表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| order_number | TEXT | NOT NULL, UNIQUE | 订单编号（自动生成） |
| customer_id | INTEGER | NOT NULL, FK→customers(id) | 客户 ID |
| order_date | TEXT | DEFAULT CURRENT_TIMESTAMP | 订单日期 |
| status | TEXT | DEFAULT 'pending' | 状态（pending/confirmed/shipped/completed/cancelled） |
| total_amount | REAL | DEFAULT 0 | 订单总金额 |
| currency | TEXT | DEFAULT 'USD' | 结算货币 |
| shipping_method | TEXT | DEFAULT '' | 运输方式 |
| shipping_address | TEXT | DEFAULT '' | 收货地址 |
| tracking_number | TEXT | DEFAULT '' | 物流单号 |
| estimated_date | TEXT | DEFAULT NULL | 预计交付日期 |
| actual_date | TEXT | DEFAULT NULL | 实际交付日期 |
| notes | TEXT | DEFAULT '' | 备注 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

#### 4.2.6 order_items — 订单明细表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| order_id | INTEGER | NOT NULL, FK→orders(id) | 关联订单 |
| part_id | INTEGER | NOT NULL, FK→parts(id) | 关联配件 |
| quantity | INTEGER | NOT NULL | 数量 |
| unit_price | REAL | NOT NULL | 单价 |
| discount_pct | REAL | DEFAULT 0 | 折扣百分比 |
| subtotal | REAL | NOT NULL | 小计（自动计算） |
| fulfillment_qty | INTEGER | DEFAULT 0 | 已发货数量 |
| notes | TEXT | DEFAULT '' | 备注 |

---

#### 4.2.7 prices — 价格表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| part_id | INTEGER | NOT NULL, FK→parts(id) | 关联配件 |
| price_type | TEXT | DEFAULT '批发价' | 价格类型（批发价/零售价/促销价） |
| currency | TEXT | DEFAULT 'USD' | 货币 |
| unit_price | REAL | NOT NULL | 单价 |
| min_quantity | INTEGER | DEFAULT 1 | 最小数量（阶梯定价） |
| max_quantity | INTEGER | DEFAULT 99999 | 最大数量 |
| effective_date | TEXT | DEFAULT '' | 生效日期 |
| expiry_date | TEXT | DEFAULT '' | 失效日期 |
| notes | TEXT | DEFAULT '' | 备注 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

#### 4.2.8 price_log — 价格变更日志表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| price_id | INTEGER | NOT NULL, FK→prices(id) | 关联价格 |
| old_price | REAL | NOT NULL | 原价格 |
| new_price | REAL | NOT NULL | 新价格 |
| change_reason | TEXT | DEFAULT '' | 变更原因 |
| operator | TEXT | DEFAULT 'system' | 操作人 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 操作时间 |

---

#### 4.2.9 supplier_parts — 供应商-配件关联表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| supplier_id | INTEGER | NOT NULL, FK→suppliers(id) | 供应商 ID |
| part_id | INTEGER | NOT NULL, FK→parts(id) | 配件 ID |
| supplier_sku | TEXT | DEFAULT '' | 供应商 SKU |
| moq | INTEGER | DEFAULT 1 | 最小起订量 |
| lead_time_days | INTEGER | DEFAULT 0 | 交货周期 |
| notes | TEXT | DEFAULT '' | 备注 |
| UNIQUE(supplier_id, part_id) | — | — | 联合唯一约束 |

---

#### 4.2.10 image_assets — 图片资源表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| part_id | INTEGER | DEFAULT NULL, FK→parts(id) | 关联配件（NULL=素材库） |
| file_path | TEXT | NOT NULL | 文件存储路径 |
| file_name | TEXT | NOT NULL | 文件名 |
| file_size | INTEGER | DEFAULT 0 | 文件大小（字节） |
| width | INTEGER | DEFAULT 0 | 图片宽度 |
| height | INTEGER | DEFAULT 0 | 图片高度 |
| ocr_text | TEXT | DEFAULT '' | OCR 识别文字 |
| tags | TEXT | DEFAULT '' | 标签（逗号分隔） |
| category | TEXT | DEFAULT '' | 分类（产品图/包装图/图纸） |
| is_primary | INTEGER | DEFAULT 0 | 是否主图 |
| sort_order | INTEGER | DEFAULT 0 | 排序权重 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 上传时间 |

---

#### 4.2.11 quotations — 报价单表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| quotation_number | TEXT | NOT NULL, UNIQUE | 报价单编号 |
| template_id | INTEGER | FK→quotation_templates(id) | 使用的模板 |
| customer_id | INTEGER | FK→customers(id) | 客户 ID |
| total_amount | REAL | DEFAULT 0 | 总金额 |
| currency | TEXT | DEFAULT 'USD' | 货币 |
| status | TEXT | DEFAULT 'draft' | 状态（draft/sent/accepted/expired） |
| remark | TEXT | DEFAULT '' | 备注 |
| pdf_path | TEXT | DEFAULT '' | 生成的 PDF 路径 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

---

#### 4.2.12 quotation_items — 报价单明细表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| quotation_id | INTEGER | NOT NULL, FK→quotations(id) | 关联报价单 |
| part_id | INTEGER | NOT NULL, FK→parts(id) | 关联配件 |
| oe_number | TEXT | NOT NULL | OE 编号（快照） |
| part_name | TEXT | NOT NULL | 配件名称（快照） |
| quantity | INTEGER | NOT NULL | 数量 |
| unit_price | REAL | NOT NULL | 单价 |
| subtotal | REAL | NOT NULL | 小计 |

---

#### 4.2.13 quotation_templates — 报价模板表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| template_name | TEXT | NOT NULL | 模板名称 |
| header_text | TEXT | DEFAULT '' | 页眉文本（公司信息） |
| footer_text | TEXT | DEFAULT '' | 页脚文本 |
| terms_text | TEXT | DEFAULT '' | 条款说明 |
| currency | TEXT | DEFAULT 'USD' | 默认货币 |
| include_image | INTEGER | DEFAULT 1 | 是否包含配件图片 |
| is_default | INTEGER | DEFAULT 0 | 是否默认模板 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

#### 4.2.14 settings — 系统设置表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| key | TEXT | PK | 设置键 |
| value | TEXT | DEFAULT '' | 设置值 |

**预置设置项**：

| key | 默认值 | 说明 |
|-----|--------|------|
| company_name | — | 公司名称 |
| default_currency | USD | 默认货币 |
| low_stock_alert | true | 低库存预警开关 |
| database_version | 2 | 数据库版本号 |

---

#### 4.2.15 import_history — 导入历史表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| import_type | TEXT | NOT NULL | 导入类型（parts/suppliers/customers） |
| file_name | TEXT | NOT NULL | 导入文件名 |
| total_rows | INTEGER | DEFAULT 0 | 总行数 |
| success_count | INTEGER | DEFAULT 0 | 成功行数 |
| error_count | INTEGER | DEFAULT 0 | 失败行数 |
| status | TEXT | DEFAULT 'pending' | 状态 |
| error_details | TEXT | DEFAULT '' | 错误详情（JSON） |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 导入时间 |

---

## 5. API 接口文档

> ⚠️ **注意**：当前为 Tauri IPC 命令，非 HTTP API。Web 版需将其改造为 RESTful API 或 GraphQL。

### 5.1 调用方式说明

**当前（Tauri）调用方式**：
```typescript
import { invoke } from '@/lib/tauri';
const result = await invoke<ResponseType>('command_name', { param1, param2 });
```

**Web 版预期调用方式**：
```typescript
import { api } from '@/lib/api';  // axios/fetch 封装
const result = await api.get('/api/parts', { params: { page, page_size } });
```

---

### 5.2 Parts API（配件管理）

#### `get_parts` — 分页查询配件列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pagination | `{ page: number, page_size: number }` | ✅ | 分页参数 |
| filters | `PartFilters` | ❌ | 过滤条件 |

**PartFilters 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| category | string | 按一级分类筛选 |
| sub_category | string | 按二级分类筛选 |
| brand | string | 按品牌筛选 |
| car_model | string | 按车型筛选 |
| part_type | string | 按配件类型筛选 |
| is_active | boolean | 按启用状态筛选 |
| keyword | string | 关键词搜索（OE编号/名称） |

**响应**：`PaginatedResponse<PartWithStock>`

---

#### `get_part_by_id` — 获取配件详情

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 配件 ID |

**响应**：`Part`

---

#### `create_part` — 创建配件

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `CreatePartDto` | ✅ | 创建数据 |

**CreatePartDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oe_number | string | ✅ | OE 编号 |
| part_name_cn | string | ✅ | 中文名称 |
| part_name_en | string | ❌ | 英文名称 |
| category | string | ❌ | 分类 |
| brand | string | ❌ | 品牌 |
| car_model | string | ❌ | 车型 |
| part_type | string | ❌ | 类型 |
| specifications | string | ❌ | 规格 |
| unit | string | ❌ | 单位 |
| hs_code | string | ❌ | 海关编码 |

**响应**：`Part`

---

#### `update_part` — 更新配件

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 配件 ID |
| data | `UpdatePartDto` | ✅ | 更新数据（所有字段可选） |

**响应**：`Part`

---

#### `delete_part` — 删除配件

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 配件 ID |

**响应**：`void`

---

#### `search_parts` — 搜索配件（防抖搜索）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | ✅ | 搜索关键词 |
| limit | number | ❌ | 返回数量限制（默认 20） |

**响应**：`PartWithStock[]`

---

#### `get_part_categories` — 获取所有分类列表

**参数**：无

**响应**：`string[]`（分类名称数组）

---

### 5.3 Inventory API（库存管理）

#### `get_inventory` — 分页查询库存列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pagination | `{ page, page_size }` | ✅ | 分页参数 |
| filters | `InventoryFilters` | ❌ | 过滤条件 |

**InventoryFilters 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| warehouse_zone | string | 按库区筛选 |
| category | string | 按配件分类筛选 |
| is_low_stock | boolean | 仅显示低库存 |
| keyword | string | 关键词搜索 |

**响应**：`PaginatedResponse<InventoryItem>`

---

#### `get_inventory_by_part` — 获取指定配件库存

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |

**响应**：`InventoryItem`

---

#### `adjust_stock` — 调整库存（入库/出库）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |
| delta | number | ✅ | 变动数量（正=入库，负=出库） |
| reason | string | ✅ | 调整原因 |

**响应**：`InventoryItem`（更新后的库存信息）

**错误**：库存不足时返回 `ValidationError`

---

#### `get_low_stock` — 获取低库存预警列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | ❌ | 返回数量限制（默认 50，最大 200） |

**响应**：`InventoryItem[]`

---

#### `get_inventory_logs` — 获取库存变动日志

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |
| pagination | `{ page, page_size }` | ✅ | 分页参数 |

**响应**：`PaginatedResponse<InventoryLog>`

---

### 5.4 Suppliers API（供应商管理）

#### `get_suppliers` — 分页查询供应商列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pagination | `{ page, page_size }` | ✅ | 分页参数 |
| is_active | boolean | ❌ | 按合作状态筛选 |

**响应**：`PaginatedResponse<Supplier>`

---

#### `get_supplier_by_id` — 获取供应商详情

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 供应商 ID |

**响应**：`Supplier`

---

#### `create_supplier` — 创建供应商

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `CreateSupplierDto` | ✅ | 创建数据 |

**响应**：`Supplier`

---

#### `update_supplier` — 更新供应商

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 供应商 ID |
| data | `UpdateSupplierDto` | ✅ | 更新数据 |

**响应**：`Supplier`

---

#### `toggle_supplier_active` — 切换供应商合作状态

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 供应商 ID |
| is_active | boolean | ✅ | 目标状态 |

**响应**：`void`

---

#### `link_supplier_part` — 关联供应商与配件

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `LinkSupplierPartDto` | ✅ | 关联数据 |

**LinkSupplierPartDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| supplier_id | number | ✅ | 供应商 ID |
| part_id | number | ✅ | 配件 ID |
| supplier_sku | string | ❌ | 供应商 SKU |
| moq | number | ❌ | 最小起订量 |
| lead_time_days | number | ❌ | 交货周期 |

**响应**：`void`

---

#### `get_supplier_parts` — 获取供应商关联的配件列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| supplier_id | number | ✅ | 供应商 ID |

**响应**：`SupplierPart[]`

---

### 5.5 Customers API（客户管理）

#### `get_customers` — 分页查询客户列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pagination | `{ page, page_size }` | ✅ | 分页参数 |
| filters | `CustomerFilters` | ❌ | 过滤条件 |

**CustomerFilters 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| customer_type | string | 按客户类型筛选 |
| region | string | 按地区筛选 |
| is_active | boolean | 按合作状态筛选 |
| keyword | string | 关键词搜索（公司名/联系人） |

**响应**：`PaginatedResponse<Customer>`

---

#### `get_customer_by_id` — 获取客户详情

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 客户 ID |

**响应**：`Customer`

---

#### `create_customer` — 创建客户

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `CreateCustomerDto` | ✅ | 创建数据 |

**响应**：`Customer`

---

#### `update_customer` — 更新客户

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 客户 ID |
| data | `UpdateCustomerDto` | ✅ | 更新数据 |

**响应**：`Customer`

---

#### `toggle_customer_active` — 切换客户合作状态

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 客户 ID |
| is_active | boolean | ✅ | 目标状态 |

**响应**：`void`

---

### 5.6 Prices API（价格管理）

#### `get_prices_by_part` — 获取配件的所有价格档位

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |

**响应**：`Price[]`

---

#### `set_price` — 设置/更新价格（存在则更新，不存在则创建）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `SetPriceDto` | ✅ | 价格数据 |

**SetPriceDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |
| price_type | string | ❌ | 价格类型（默认"批发价"） |
| currency | string | ❌ | 货币（默认"USD"） |
| unit_price | number | ✅ | 单价 |
| min_quantity | number | ❌ | 最小数量（默认 1） |
| max_quantity | number | ❌ | 最大数量（默认 99999） |
| effective_date | string | ❌ | 生效日期 |
| expiry_date | string | ❌ | 失效日期 |
| reason | string | ❌ | 变更原因（记录到 price_log） |
| operator | string | ❌ | 操作人（默认"system"） |

**响应**：`Price`

**副作用**：价格发生变更时自动写入 `price_log` 表

---

#### `delete_price` — 删除价格档位

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 价格记录 ID |

**响应**：`void`

---

#### `batch_update_prices` — 批量更新价格

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| updates | `SetPriceDto[]` | ✅ | 批量更新数据 |

**响应**：`Price[]`

---

#### `get_price_history` — 获取配件价格变更历史

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |

**响应**：`PriceLog[]`

---

### 5.7 Orders API（订单管理）

#### `get_orders` — 分页查询订单列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pagination | `{ page, page_size }` | ✅ | 分页参数 |
| filters | `OrderFilters` | ❌ | 过滤条件 |

**OrderFilters 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 按订单状态筛选 |
| customer_id | number | 按客户 ID 筛选 |
| date_from | string | 订单日期起始 |
| date_to | string | 订单日期结束 |
| keyword | string | 关键词搜索 |

**响应**：`PaginatedResponse<Order>`

---

#### `get_order_by_id` — 获取订单详情（含订单项）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 订单 ID |

**响应**：`OrderDetail`（含 order 和 items 两个字段）

---

#### `create_order` — 创建订单

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `CreateOrderDto` | ✅ | 订单数据 |

**CreateOrderDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customer_id | number | ✅ | 客户 ID |
| currency | string | ❌ | 货币 |
| shipping_method | string | ❌ | 运输方式 |
| shipping_address | string | ❌ | 收货地址 |
| notes | string | ❌ | 备注 |
| items | `OrderItemDto[]` | ✅ | 订单项列表 |

**OrderItemDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ✅ | 配件 ID |
| quantity | number | ✅ | 数量 |
| unit_price | number | ❌ | 单价（不填则取当前批发价） |
| discount_pct | number | ❌ | 折扣百分比 |

**响应**：`OrderDetail`

**副作用**：
- 自动扣减库存（`inventory.quantity -= quantity`）
- 自动增加预留（`inventory.reserved_quantity += quantity`）
- 自动写入库存日志（`inventory_log`）
- 自动生成订单编号（`ORD + YYYYMMDD + 4位序列号`）

---

#### `update_order_status` — 更新订单状态

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 订单 ID |
| status | string | ✅ | 新状态 |

**状态流转**：
- `pending` → `confirmed`（确认订单）
- `confirmed` → `shipped`（发货）
- `shipped` → `completed`（完成）
- 任意状态 → `cancelled`（取消）

**响应**：`Order`

---

#### `cancel_order` — 取消订单

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 订单 ID |
| reason | string | ✅ | 取消原因 |

**副作用**：
- 恢复库存（`inventory.quantity += quantity`）
- 减少预留（`inventory.reserved_quantity -= quantity`）

**响应**：`void`

---

#### `get_order_stats` — 获取订单统计数据

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date_from | string | ❌ | 统计起始日期 |
| date_to | string | ❌ | 统计结束日期 |

**响应**：`OrderStats`

**OrderStats 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| total_orders | number | 订单总数 |
| pending_orders | number | 待处理订单数 |
| confirmed_orders | number | 已确认订单数 |
| shipped_orders | number | 已发货订单数 |
| completed_orders | number | 已完成订单数 |
| cancelled_orders | number | 已取消订单数 |
| current_month_total | number | 本月订单总数 |
| current_month_revenue | number | 本月营收总额 |

---

### 5.8 Quotations API（报价管理）

#### `get_quotation_templates` — 获取报价模板列表

**参数**：无

**响应**：`QuotationTemplate[]`

---

#### `get_quotation_template_by_id` — 获取报价模板详情

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 模板 ID |

**响应**：`QuotationTemplate`

---

#### `save_quotation_template` — 保存报价模板（新建）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `SaveTemplateDto` | ✅ | 模板数据 |

**响应**：`QuotationTemplate`

---

#### `update_quotation_template` — 更新报价模板

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 模板 ID |
| data | `UpdateTemplateDto` | ✅ | 更新数据 |

**响应**：`QuotationTemplate`

---

#### `delete_quotation_template` — 删除报价模板

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | ✅ | 模板 ID |

**响应**：`void`

---

#### `generate_quotation` — 生成报价单

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `GenerateQuotationDto` | ✅ | 报价单数据 |

**GenerateQuotationDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| template_id | number | ✅ | 使用的模板 ID |
| customer_id | number | ✅ | 客户 ID |
| items | `QuotationItem[]` | ✅ | 报价明细 |
| currency | string | ❌ | 货币 |
| remark | string | ❌ | 备注 |

**响应**：`string`（报价单 ID/编号）

**副作用**：写入 `quotations` 和 `quotation_items` 表

---

#### `export_quotation_pdf` — 导出报价单为 PDF

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| quotation_id | string | ✅ | 报价单 ID |

**响应**：`string`（PDF 文件路径）

---

### 5.9 Images API（图片管理）

#### `get_part_images` — 获取配件图片列表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ❌ | 配件 ID（不传则按 category 查素材库） |
| category | string | ❌ | 图片分类 |

**响应**：`ImageAsset[]`

---

#### `upload_part_image` — 上传配件图片

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `UploadImageDto` | ✅ | 上传数据 |

**UploadImageDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| part_id | number | ❌ | 关联配件 ID（素材库图片可不传） |
| file_path | string | ✅ | 源文件路径（Tauri 端为本地路径） |
| category | string | ❌ | 图片分类 |
| is_primary | boolean | ❌ | 是否设为主图 |

**响应**：`ImageAsset`

**副作用**：
- 复制文件到 `Documents/CarPartsB2B/images/` 目录
- 读取图片尺寸（width/height）
- 写入 `image_assets` 表

---

#### `set_primary_image` — 设置主图

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_id | number | ✅ | 图片 ID |
| part_id | number | ✅ | 配件 ID |

**响应**：`void`

**副作用**：先将同配件所有图片的 `is_primary` 设为 0，再将该图片设为 1

---

#### `delete_image` — 删除图片

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_id | number | ✅ | 图片 ID |

**响应**：`void`

**副作用**：同时删除数据库记录和物理文件

---

### 5.10 Import API（数据导入）

#### `import_from_excel` — 从 Excel 导入数据

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | `ImportDto` | ✅ | 导入数据 |

**ImportDto 结构**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file_path | string | ✅ | Excel 文件路径 |
| import_type | string | ✅ | 导入类型（parts/suppliers/customers） |
| field_mapping | `Record<string, string>` | ❌ | 字段映射（Excel列名→数据库字段） |

**响应**：`ImportResult`

**ImportResult 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| total_rows | number | 总处理行数 |
| success_count | number | 成功行数 |
| error_count | number | 失败行数 |
| errors | string[] | 错误详情列表 |

---

#### `export_import_template` — 导出导入模板（Excel 格式）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| importType | string | ✅ | 模板类型（parts/suppliers/customers） |

**响应**：`string`（模板文件路径）

---

### 5.11 System API（系统设置）

#### `get_settings` — 获取所有系统设置

**参数**：无

**响应**：`Record<string, string>`（键值对）

---

#### `update_setting` — 更新系统设置

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | ✅ | 设置键 |
| value | string | ✅ | 设置值 |

**响应**：`void`

---

#### `get_db_stats` — 获取数据库统计信息

**参数**：无

**响应**：`DbStats`

**DbStats 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| total_parts | number | 配件总数 |
| total_suppliers | number | 供应商总数 |
| total_customers | number | 客户总数 |
| total_orders | number | 订单总数 |
| total_inventory_items | number | 有库存记录的配件数 |
| low_stock_count | number | 低库存配件数 |
| recent_order_count | number | 近期订单数（30天） |

---

### 5.12 通用响应格式

#### `PaginatedResponse<T>`

| 字段 | 类型 | 说明 |
|------|------|------|
| items | `T[]` | 当前页数据列表 |
| total | number | 总记录数 |
| page | number | 当前页码 |
| page_size | number | 每页数量 |
| total_pages | number | 总页数 |

---

## 6. 前端组件结构

### 6.1 路由配置

```typescript
// src/router.tsx
"/"                  → Dashboard          // 仪表盘（统计概览）
"/parts"             → PartsCatalog       // 配件目录（列表+搜索+新建）
"/parts/:id"         → PartDetail         // 配件详情（编辑+库存+图片）
"/inventory"         → Inventory          // 库存管理（库存列表+调整）
"/suppliers"         → Suppliers          // 供应商管理
"/customers"         → Customers          // 客户管理
"/pricing"           → Pricing            // 价格管理
"/orders"            → Orders             // 订单列表
"/orders/:id"        → OrderDetail        // 订单详情
"/quotations"        → Quotations        // 报价管理
"/import"            → ImportData         // 数据导入
"/assets"            → Assets             // 图片素材库
"/facebook"          → Facebook           // Facebook 集成（待实现）
"/settings"          → Settings           // 系统设置
"*"                  → NotFound           // 404
```

### 6.2 布局组件

```
App
└── AppShell（布局外壳）
    ├── Sidebar（侧边栏导航）
    ├── Header（顶部栏：搜索+用户）
    └── <Outlet>（子路由渲染区）
        ├── Dashboard
        ├── PartsCatalog
        ├── PartDetail
        ├── Inventory
        ├── Suppliers
        ├── Customers
        ├── Pricing
        ├── Orders
        ├── OrderDetail
        ├── Quotations
        ├── ImportData
        ├── Assets
        ├── Settings
        └── NotFound
```

### 6.3 基础 UI 组件库（`src/components/ui/`）

| 组件 | 功能 | 关键 Props |
|------|------|-----------|
| `Button` | 按钮 | variant, size, disabled, onClick |
| `Input` | 输入框 | value, onChange, placeholder, type |
| `Select` | 下拉选择 | options, value, onChange |
| `Card` | 卡片容器 | children, className |
| `Table` | 数据表格 | columns, data, keyField |
| `Modal` | 弹窗 | isOpen, onClose, title, children |
| `Badge` | 状态标签 | color, children |
| `Pagination` | 分页器 | page, page_size, total, onChange |
| `EmptyState` | 空状态提示 | icon, title, description |
| `StatCard` | 统计卡片 | title, value, icon, color |

### 6.4 自定义 Hooks

| Hook | 功能 | 返回 |
|------|------|------|
| `usePagination(defaultSize)` | 分页状态管理 | `{ page, pageSize, updateFromResponse }` |
| `usePartSearch(debounceMs)` | 配件搜索（防抖） | `{ results, setQuery }` |

### 6.5 状态管理（Zustand Store 设计）

Web 版建议按模块拆分 store：

```
stores/
├── usePartStore.ts        # 配件列表缓存、筛选状态
├── useInventoryStore.ts   # 库存数据
├── useOrderStore.ts       # 订单列表、统计
├── useCustomerStore.ts    # 客户数据
├── useSupplierStore.ts    # 供应商数据
└── useUiStore.ts         # 全局 UI 状态（侧边栏折叠等）
```

---

## 7. 业务逻辑说明

### 7.1 配件管理业务流程

```
[创建配件]
  1. 填写 OE 编号（唯一性校验）
  2. 填写中/英文名称、分类、品牌、车型
  3. 填写规格参数（JSON 格式）
  4. 提交 → 写入 parts 表
  5. 自动在 inventory 表创建库存记录（quantity=0）

[搜索配件]
  1. 用户输入关键词
  2. 前端防抖 300ms
  3. 调用 search_parts API（FTS5 全文搜索）
  4. 返回匹配结果（含库存信息）

[删除配件]
  1. 检查是否有关联的订单/报价（保护）
  2. 确认删除 → 删除 parts 记录
  3. 同步删除 inventory、prices、image_assets 关联记录
```

---

### 7.2 库存管理业务流程

```
[入库流程]
  1. 选择配件（搜索或扫码）
  2. 输入入库数量（delta > 0）
  3. 填写入库原因（采购入库/退货入库/盘盈）
  4. 提交 → adjust_stock
  5. 数据库事务：
     a. inventory.quantity += delta
     b. 写入 inventory_log（change_type='IN'）
  6. 返回更新后的库存信息

[出库流程]
  1. 选择配件
  2. 输入出库数量（delta < 0）
  3. 填写出库原因（销售出库/领用/盘亏）
  4. 提交 → adjust_stock
  5. 校验：quantity >= |delta|（不足则报错）
  6. 数据库事务：
     a. inventory.quantity -= |delta|
     b. 写入 inventory_log（change_type='OUT'）
  7. 返回更新后的库存信息

[低库存预警]
  - 每次加载库存列表时，标记 quantity <= min_stock 的记录
  - Dashboard 显示低库存配件数量
  - 可通过 get_low_stock API 获取完整预警列表
```

---

### 7.3 订单管理业务流程

```
[创建订单]
  1. 选择客户
  2. 添加订单项：
     a. 搜索配件
     b. 输入数量
     c. 确认单价（自动填充批发价，可修改）
     d. 可设置折扣
  3. 填写运输方式、收货地址
  4. 提交 → create_order
  5. 数据库事务：
     a. 写入 orders 表（自动生成订单编号）
     b. 写入 order_items 表（逐条计算 subtotal）
     c. 更新 orders.total_amount（SUM(subtotal)）
     d. 扣减库存：inventory.quantity -= quantity
     e. 增加预留：inventory.reserved_quantity += quantity
     f. 写入 inventory_log
  6. 返回订单详情

[订单状态流转]
  pending   → 客户下单，待确认
    ↓ confirm
  confirmed → 已确认，待发货
    ↓ ship
  shipped   → 已发货，待收货
    ↓ complete
  completed → 已完成
  
  * 任意状态 → cancel（取消订单，需填写原因）
    → 恢复库存

[取消订单]
  1. 检查当前状态（completed 不可取消）
  2. 填写取消原因
  3. 提交 → cancel_order
  4. 数据库事务：
     a. 更新 orders.status = 'cancelled'
     b. 恢复库存：逐条 order_items 处理
        inventory.quantity += quantity
        inventory.reserved_quantity -= quantity
     c. 写入 inventory_log
```

---

### 7.4 报价管理业务流程

```
[配置报价模板]
  1. 设置模板名称
  2. 编写页眉（公司名称、地址、联系方式）
  3. 编写页脚（银行信息、税务信息）
  4. 编写条款（交货期、付款方式、保修条款）
  5. 设置默认货币
  6. 设置是否包含配件图片
  7. 保存 → save_quotation_template

[生成报价单]
  1. 选择报价模板
  2. 选择客户
  3. 添加报价明细：
     a. 搜索配件
     b. 输入数量
     c. 确认单价
  4. 填写备注
  5. 生成 → generate_quotation
  6. 写入 quotations 和 quotation_items 表
  7. 返回 quotation_id

[导出 PDF]
  1. 点击"导出 PDF"
  2. 调用 export_quotation_pdf
  3. Rust 后端使用 PDF 库渲染：
     a. 渲染模板页眉
     b. 渲染客户信息
     c. 渲染报价明细表格（含图片）
     d. 渲染合计金额
     e. 渲染条款和页脚
  4. 保存到本地路径
  5. 返回 PDF 文件路径
```

---

### 7.5 价格管理业务流程

```
[设置价格]
  1. 选择配件
  2. 设置价格类型（批发价/零售价/促销价）
  3. 设置货币
  4. 设置单价
  5. 设置阶梯数量（min_quantity, max_quantity）
  6. 设置生效/失效日期（可选）
  7. 提交 → set_price
  8. 逻辑：
     - 若 (price_type, min_quantity) 已存在 → 更新
     - 若价格未变 → 跳过（不写日志）
     - 若价格变更 → 更新 + 写入 price_log
  9. 返回价格记录

[价格历史]
  - 每次价格变更（且实际发生变化）时自动记录到 price_log
  - 可通过 get_price_history 查看某配件的所有价格变更记录
```

---

### 7.6 数据导入业务流程

```
[导入 Excel]
  1. 选择导入类型（配件/供应商/客户）
  2. 下载导入模板（export_import_template）
  3. 填写 Excel 文件
  4. 选择文件 → import_from_excel
  5. Rust 后端使用 calamine 库读取 Excel：
     a. 解析表头（支持 field_mapping 自定义映射）
     b. 逐行验证数据
     c. 写入数据库（事务：全部成功或全部回滚）
     d. 收集错误行信息
  6. 返回导入结果（成功数/失败数/错误详情）
  7. 写入 import_history 表

[字段映射]
  - 默认按表头名称匹配数据库字段
  - 支持自定义 field_mapping：{ "Excel列名": "数据库字段名" }
  - 示例：{ "OE No.": "oe_number", "产品名称": "part_name_cn" }
```

---

## 8. Web 版移植指南

### 8.1 架构改造总览

| 层面 | 当前（Tauri） | Web 版目标 |
|------|-------------|----------|
| 通信方式 | Tauri IPC（`invoke`） | HTTP REST API |
| 后端运行环境 | 本地 Rust 进程 | 远程服务器（Node.js 或 Rust） |
| 数据库 | 本地 SQLite 文件 | PostgreSQL（主库）+ Redis（缓存） |
| 文件存储 | 本地文件系统 | 对象存储（S3/OSS）或服务器磁盘 |
| 身份认证 | 无需（本地应用） | JWT + Refresh Token |
| 多用户 | 不支持（单用户本地） | 支持多用户并发 |
| 实时性 | 同步调用 | 支持异步 + WebSocket 推送 |

---

### 8.2 后端技术选型对比

#### 方案 A：Node.js + Express/NestJS（推荐）

**优势**：
- 与前端 TypeScript 共享类型定义
- 生态丰富，开发效率高
- 团队学习成本低

**技术栈**：
- Runtime：Node.js 20+
- 框架：NestJS（推荐）或 Express
- ORM：Prisma 或 TypeORM
- 数据库：PostgreSQL
- 认证：Passport.js + JWT
- 文件上传：Multer
- Excel 处理：SheetJS (xlsx)
- PDF 生成：Puppeteer + Handlebars 模板

---

#### 方案 B：Rust + Actix-web/Axum（保留 Rust 后端）

**优势**：
- 直接复用现有 Rust 业务逻辑代码
- 性能优异，内存安全
- 与现有代码库无缝衔接

**挑战**：
- 需要增加 HTTP 层（Actix-web / Axum）
- 需要改造为多用户架构
- 前端需要完全重写 API 调用层

**建议**：若团队 Rust 经验丰富，可选择此方案

---

### 8.3 API 改造对照表

将 Tauri 命令改造为 RESTful API 端点：

| Tauri 命令 | HTTP 方法 | API 端点 | 说明 |
|------------|-----------|---------|------|
| `get_parts` | `GET` | `/api/parts` | 分页查询（query params 传 filters） |
| `get_part_by_id` | `GET` | `/api/parts/:id` | |
| `create_part` | `POST` | `/api/parts` | |
| `update_part` | `PUT` | `/api/parts/:id` | |
| `delete_part` | `DELETE` | `/api/parts/:id` | |
| `search_parts` | `GET` | `/api/parts/search?q=xxx` | |
| `get_inventory` | `GET` | `/api/inventory` | |
| `adjust_stock` | `POST` | `/api/inventory/adjust` | |
| `get_orders` | `GET` | `/api/orders` | |
| `create_order` | `POST` | `/api/orders` | |
| `update_order_status` | `PATCH` | `/api/orders/:id/status` | |
| `generate_quotation` | `POST` | `/api/quotations/generate` | |
| `export_quotation_pdf` | `GET` | `/api/quotations/:id/pdf` | 返回 PDF 文件流 |
| `import_from_excel` | `POST` | `/api/import` | `multipart/form-data` |
| `upload_part_image` | `POST` | `/api/images/upload` | `multipart/form-data` |

---

### 8.4 数据库迁移方案

#### SQLite → PostgreSQL 迁移步骤

**Step 1：Schema 转换**

| SQLite | PostgreSQL | 说明 |
|--------|-----------|------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` 或 `BIGSERIAL` | 自增主键 |
| `TEXT` | `VARCHAR` 或 `TEXT` | 文本类型 |
| `INTEGER` | `INTEGER` 或 `INT4` | 整数 |
| `REAL` | `DECIMAL(p,s)` 或 `FLOAT8` | 浮点数（价格建议用 DECIMAL） |
| `DATETIME` | `TIMESTAMP WITH TIME ZONE` | 时间戳 |
| `BOOLEAN`（用 INTEGER 0/1） | `BOOLEAN` | 布尔值 |
| `FTS5` 全文搜索 | `pg_trgm` + `GIN` 索引 | 全文搜索替代方案 |

**Step 2：数据迁移脚本**

使用 Python 编写迁移脚本：
1. 从 SQLite 读取数据（`sqlite3` 模块）
2. 转换数据类型和格式
3. 批量写入 PostgreSQL（`psycopg2` 或 `asyncpg`）
4. 验证数据一致性（行数、校验和）

**Step 3：全文搜索迁移**

SQLite FTS5 → PostgreSQL 方案：
```sql
-- 创建 GIN 索引支持模糊搜索
CREATE INDEX idx_parts_name_gin ON parts
USING GIN ((part_name_cn || ' ' || part_name_en || ' ' || oe_number) gin_trgm_ops);

-- 搜索查询
SELECT * FROM parts
WHERE (part_name_cn || ' ' || part_name_en || ' ' || oe_number) % '查询关键词'
ORDER BY similarity((part_name_cn || ' ' || part_name_en || ' ' || oe_number), '查询关键词') DESC;
```

---

### 8.5 文件存储改造

#### 当前方案（本地文件系统）

```rust
// Rust 后端
let images_dir = dirs::document_dir().join("CarPartsB2B/images");
std::fs::copy(source, &dest_path)?;
```

#### Web 版方案

**方案 1：对象存储（推荐）**

| 存储服务 | 适用场景 |
|---------|---------|
| AWS S3 | 生产环境，高可用 |
| 阿里云 OSS | 国内部署 |
| MinIO | 私有部署，S3 兼容 |

**上传流程**：
1. 客户端上传文件到后端 API（`multipart/form-data`）
2. 后端验证文件类型和大小
3. 生成唯一文件名（UUID）
4. 上传到对象存储
5. 将 URL 写入数据库
6. 返回图片访问 URL

**方案 2：本地磁盘 + Nginx 静态文件服务**（小规模部署）

```nginx
# Nginx 配置
location /images/ {
    root /var/www/carparts/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

### 8.6 认证与权限改造

#### 当前（无需认证）

```typescript
// Tauri：直接调用，无认证
const result = await invoke('get_parts', { pagination, filters });
```

#### Web 版（JWT 认证）

**登录流程**：
```
用户登录 → POST /api/auth/login
         → 验证用户名密码
         → 返回 access_token（JWT，短期）+ refresh_token（长期）
         → 前端存储 token（httpOnly cookie 或 secure storage）
```

**API 请求流程**：
```
前端请求 → 附加 Authorization Header
         → 后端中间件验证 token
         → 解析用户身份和权限
         → 执行业务逻辑
         → 返回结果
```

**权限设计（RBAC）**：

| 角色 | 权限 |
|------|------|
| `admin` | 全部权限 |
| `manager` | 查看所有 + 编辑（除系统设置） |
| `operator` | 查看 + 创建/编辑订单和库存 |
| `viewer` | 只读权限 |

---

### 8.7 前端改造要点

#### 8.7.1 API 调用层改造

**当前（`src/lib/api.ts`）**：
```typescript
import { invoke } from '@/lib/tauri';
export async function getParts(...) {
  return invoke<PaginatedResponse<PartWithStock>>("get_parts", { ... });
}
```

**改造后**：
```typescript
import api from '@/lib/http';  // axios 实例
export async function getParts(...) {
  return api.get<PaginatedResponse<PartWithStock>>('/api/parts', {
    params: { page, page_size, ...filters }
  }).then(r => r.data);
}
```

#### 8.7.2 文件上传改造

**当前**：
```typescript
// Tauri：选择本地文件对话框
const filePath = await invoke('select_file_dialog');
await invoke('upload_part_image', { data: { part_id, file_path: filePath } });
```

**改造后**：
```typescript
// Web：使用 <input type="file" /> 或拖拽上传
const formData = new FormData();
formData.append('file', file);
formData.append('part_id', partId);
const result = await api.post('/api/images/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

#### 8.7.3 实时功能（可选）

**库存变动通知**（WebSocket）：
```typescript
// 后端（Socket.io 或原生 WebSocket）
io.emit('stock_changed', { part_id, new_quantity });

// 前端
socket.on('stock_changed', (data) => {
  // 更新库存显示
  queryClient.invalidateQueries(['inventory']);
});
```

---

### 8.8 部署架构建议

#### 推荐部署架构

```
                    ┌─────────────────┐
                    │   CloudFlare    │
                    │   (CDN/WAF)    │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │   Nginx (反向代理) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌───▼────┐ ┌─────▼─────┐
     │  Frontend      │ │  API   │ │  WebSocket│
     │  (React SPA)  │ │ Server │ │  Server   │
     └───────────────┘ └───┬────┘ └───────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
     ┌────────▼────┐ ┌─────▼─────┐ ┌───▼──────┐
     │ PostgreSQL   │ │   Redis   │ │  S3/OSS  │
     │  (主数据库)  │ │  (缓存)   │ │ (文件存储) │
     └─────────────┘ └───────────┘ └──────────┘
```

#### Docker Compose 配置示例

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: carparts
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

### 8.9 开发优先级建议

| 阶段 | 内容 | 周期 |
|------|------|------|
| **Phase 1** | 数据库迁移（SQLite → PostgreSQL）+ 后端 API 基础框架搭建 | 2-3 周 |
| **Phase 2** | 核心业务 API 实现（配件/库存/订单/客户/供应商） | 3-4 周 |
| **Phase 3** | 前端 API 层改造 + 认证集成 | 2-3 周 |
| **Phase 4** | 文件上传/下载 + 报价 PDF 导出 | 1-2 周 |
| **Phase 5** | Excel 导入导出 + 图片管理 | 1-2 周 |
| **Phase 6** | 部署脚本 + Docker 配置 + CI/CD | 1 周 |
| **Phase 7** | 测试 + 性能优化 + 安全加固 | 2 周 |

**总计**：约 12-17 周（3-4 个月）

---

### 8.10 风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据库迁移数据丢失 | 高 | 迁移前完整备份 + 迁移后数据校验脚本 |
| Excel 导入逻辑复杂 | 中 | 保留 Rust calamine 处理逻辑，或用 SheetJS 重写并编写单元测试 |
| PDF 导出格式不一致 | 中 | 使用统一的 HTML 模板 + Puppeteer 渲染，编写视觉回归测试 |
| 多用户并发库存超卖 | 高 | 使用数据库行级锁或乐观锁（`UPDATE ... WHERE quantity >= ?`） |
| 文件存储迁移 | 中 | 编写迁移脚本将本地文件批量上传到对象存储，同时保留旧路径兼容 |

---

## 附录

### A. 常用 SQL 查询参考

```sql
-- 低库存配件查询
SELECT p.oe_number, p.part_name_cn, i.quantity, i.min_stock
FROM inventory i
JOIN parts p ON p.id = i.part_id
WHERE i.quantity <= i.min_stock AND p.is_active = 1;

-- 月度订单统计
SELECT strftime('%Y-%m', order_date) AS month,
       COUNT(*) AS order_count,
       SUM(total_amount) AS revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY strftime('%Y-%m', order_date)
ORDER BY month DESC;

-- 热销配件 TOP 10
SELECT p.oe_number, p.part_name_cn, SUM(oi.quantity) AS total_sold
FROM order_items oi
JOIN parts p ON p.id = oi.part_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status IN ('confirmed', 'shipped', 'completed')
GROUP BY oi.part_id
ORDER BY total_sold DESC
LIMIT 10;
```

### B. 环境变量配置（Web 版）

```bash
# .env.example
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/carparts

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# 文件上传
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# 对象存储（可选）
S3_BUCKET=carparts-images
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# 前端 URL（CORS）
FRONTEND_URL=http://localhost:5173
```

---

*文档版本：v1.0 | 生成日期：2025年 | 适用项目：Car Parts B2B v1.0.0*
