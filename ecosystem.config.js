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
    max_memory_restart: '512M',
    error_file: '/www/wwwroot/carparts/logs/error.log',
    out_file: '/www/wwwroot/carparts/logs/out.log',
    merge_logs: true,
  }]
};
