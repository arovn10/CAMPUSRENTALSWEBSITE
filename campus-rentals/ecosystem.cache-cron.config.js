module.exports = {
  apps: [{
    name: 'cache-refresh-cron',
    script: './scripts/cache-refresh-cron.js',
    cron_restart: '0 6 * * *', // Midnight CST (6 AM UTC)
    autorestart: false,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com',
      CRON_SECRET: process.env.CRON_SECRET || 'campus-rentals-cache-refresh'
    }
  }]
};

