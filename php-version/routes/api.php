<?php
/**
 * API 路由
 */

// 认证路由
Router::post('/api/auth/login', [AuthController::class, 'login']);
Router::post('/api/auth/register', [AuthController::class, 'register']);
Router::post('/api/auth/refresh', [AuthController::class, 'refresh']);
Router::get('/api/auth/me', [AuthController::class, 'me']);

// 配件路由
Router::get('/api/parts', [PartsController::class, 'index']);
Router::get('/api/parts/{id}', [PartsController::class, 'show']);
Router::post('/api/parts', [PartsController::class, 'store']);
Router::put('/api/parts/{id}', [PartsController::class, 'update']);
Router::delete('/api/parts/{id}', [PartsController::class, 'destroy']);
Router::post('/api/parts/batch-translate', [PartsController::class, 'batchTranslate']);

// 库存路由
Router::get('/api/inventory', [InventoryController::class, 'index']);
Router::get('/api/inventory/low-stock', [InventoryController::class, 'lowStock']);
Router::post('/api/inventory/adjust', [InventoryController::class, 'adjust']);

// 订单路由
Router::get('/api/orders', [OrdersController::class, 'index']);
Router::get('/api/orders/stats', [OrdersController::class, 'stats']);
Router::get('/api/orders/{id}', [OrdersController::class, 'show']);
Router::post('/api/orders', [OrdersController::class, 'store']);
Router::put('/api/orders/{id}', [OrdersController::class, 'update']);
Router::delete('/api/orders/{id}', [OrdersController::class, 'destroy']);

// 客户路由
Router::get('/api/customers', [CustomersController::class, 'index']);
Router::get('/api/customers/{id}', [CustomersController::class, 'show']);
Router::post('/api/customers', [CustomersController::class, 'store']);
Router::put('/api/customers/{id}', [CustomersController::class, 'update']);
Router::delete('/api/customers/{id}', [CustomersController::class, 'destroy']);

// 供应商路由
Router::get('/api/suppliers', [SuppliersController::class, 'index']);
Router::get('/api/suppliers/{id}', [SuppliersController::class, 'show']);
Router::post('/api/suppliers', [SuppliersController::class, 'store']);
Router::put('/api/suppliers/{id}', [SuppliersController::class, 'update']);
Router::delete('/api/suppliers/{id}', [SuppliersController::class, 'destroy']);

// 报价单路由
Router::get('/api/quotations', [QuotationsController::class, 'index']);
Router::get('/api/quotations/{id}', [QuotationsController::class, 'show']);
Router::post('/api/quotations', [QuotationsController::class, 'store']);
Router::put('/api/quotations/{id}', [QuotationsController::class, 'update']);
Router::delete('/api/quotations/{id}', [QuotationsController::class, 'destroy']);

// 素材路由
Router::get('/api/assets', [AssetsController::class, 'index']);
Router::post('/api/assets/upload', [AssetsController::class, 'upload']);
Router::delete('/api/assets/{id}', [AssetsController::class, 'destroy']);

// 待办路由
Router::get('/api/todos', [TodosController::class, 'index']);
Router::post('/api/todos', [TodosController::class, 'store']);
Router::put('/api/todos/{id}', [TodosController::class, 'update']);
Router::delete('/api/todos/{id}', [TodosController::class, 'destroy']);

// 设置路由
Router::get('/api/settings', [SettingsController::class, 'index']);
Router::put('/api/settings/{key}', [SettingsController::class, 'update']);

// 系统路由
Router::get('/api/system/health', [SystemController::class, 'health']);
Router::get('/api/system/logs', [SystemController::class, 'logs']);
Router::post('/api/system/backup', [SystemController::class, 'backup']);
