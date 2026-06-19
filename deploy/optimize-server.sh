#!/bin/bash
# CarParts B2B 服务器性能优化脚本
# 服务器配置：64核 CPU, 62GB 内存, HDD 磁盘

echo "=========================================="
echo "CarParts B2B 服务器性能优化"
echo "=========================================="

# 1. 优化 PostgreSQL 配置
echo ""
echo "[1/5] 优化 PostgreSQL 配置..."
PGPASSWORD='Cp.123456' psql -h 127.0.0.1 -U postgres -c "
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '16GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET max_parallel_workers = 16;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;
ALTER SYSTEM SET max_worker_processes = 16;
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '64MB';
ALTER SYSTEM SET min_wal_size = '512MB';
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET effective_io_concurrency = 2;
ALTER SYSTEM SET random_page_cost = 1.1;
" 2>&1

# 2. 优化系统参数
echo ""
echo "[2/5] 优化系统参数..."
echo "vm.swappiness = 10" >> /etc/sysctl.conf
echo "vm.dirty_ratio = 15" >> /etc/sysctl.conf
echo "vm.dirty_background_ratio = 5" >> /etc/sysctl.conf
sysctl -p 2>&1

# 3. 优化文件描述符限制
echo ""
echo "[3/5] 优化文件描述符限制..."
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf
echo "root soft nofile 65535" >> /etc/security/limits.conf
echo "root hard nofile 65535" >> /etc/security/limits.conf

# 4. 重启 PostgreSQL
echo ""
echo "[4/5] 重启 PostgreSQL..."
systemctl restart postgresql 2>&1 || echo "请手动重启 PostgreSQL"

# 5. 优化 PM2 配置
echo ""
echo "[5/5] 优化 PM2 配置..."
cat > /www/wwwroot/carparts/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'carparts-api',
    script: 'dist/main.js',
    cwd: '/www/wwwroot/carparts/backend',
    instances: 4,  // 使用 4 个实例（64核不需要全部使用）
    exec_mode: 'cluster',  // 使用 cluster 模式
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '2G',  // 每个实例最大 2GB
    error_file: '/www/wwwroot/carparts/logs/error.log',
    out_file: '/www/wwwroot/carparts/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // 性能优化
    node_args: '--max-old-space-size=2048',
    // 自动重启
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
EOF

echo ""
echo "=========================================="
echo "优化完成！请重启 PM2 服务："
echo "pm2 restart carparts-api"
echo "=========================================="
