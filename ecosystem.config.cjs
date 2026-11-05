module.exports = {
  apps: [
    {
      name: "tongitspinoy",
      cwd: "/var/www/jpaworx.com/tongitspinoy-profit-analyzer",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 6346,
      },
      time: true,
    },
  ],
};
