module.exports = {
  apps: [
    {
      name: "smart-app",
      script: "npm",
      args: "start",
      instances: 1,               // Next.js da port band qilinmasligi uchun faqat 1 ta instance
      exec_mode: "fork",          // Cluster rejimini o'chirib, Fork rejimiga o'tkazamiz
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",   // Xotirani 2GB gacha oshiramiz
      env: {
        NODE_ENV: "production",
        PORT: 3005                // To'g'ridan-to'g'ri 3005 portni yozamiz
      }
    }
  ]
};
