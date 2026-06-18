module.exports = {
  apps: [{
    name: "carparts-api",
    script: "dist/main.js",
    cwd: "/www/wwwroot/carparts/backend",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};
