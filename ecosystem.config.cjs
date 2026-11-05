module.exports = {
  apps: [
    {
      name: "tongitspinoy-profit-analyzer",
      cwd: "/var/www/jpaworx.com/tongitspinoy-profit-analyzer",
      script: "node_modules/.bin/next",
      args: "start",
      script: "./node_modules/.bin/next",
      args: "start -p 6346",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
⋯
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 6346,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      time: true,
    },
  ],
};
