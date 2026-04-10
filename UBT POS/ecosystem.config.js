module.exports = {
  apps: [
    {
      name: "chaqqonpro-app",
      script: "npm",
      args: "start",
      instances: "max",           // Barcha CPU Core larni ishlatish (Cluster mode)
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
