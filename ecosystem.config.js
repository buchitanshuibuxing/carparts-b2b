module.exports = {
  apps: [{
    name: 'carparts-api',
    script: 'dist/main.js',
    cwd: '/www/wwwroot/carparts/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '2G',
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
