#!/usr/bin/env node

/**
 * Cache Refresh Cron Job
 * Runs at midnight CST to refresh the property cache
 * 
 * This script should be added to crontab:
 * 0 0 * * * /usr/bin/node /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals/scripts/cache-refresh-cron.js
 * 
 * Or use PM2 cron:
 * pm2 start scripts/cache-refresh-cron.js --cron "0 0 * * *" --no-autorestart
 */

const https = require('https');
const http = require('http');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com';
const CRON_SECRET = process.env.CRON_SECRET || 'campus-rentals-cache-refresh';

// Note: This script should be run at midnight CST (6 AM UTC)
// CST is UTC-6, CDT (daylight saving) is UTC-5
// Cron job should be set to: 0 6 * * * (6 AM UTC = midnight CST/CDT approximately)

function refreshCache() {
  const url = new URL(`${SITE_URL}/api/cache/refresh`);
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
  };

  const protocol = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = protocol.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Cache refresh successful:', data);
          resolve(JSON.parse(data));
        } else {
          console.error('❌ Cache refresh failed:', res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error calling cache refresh endpoint:', error);
      reject(error);
    });

    req.end();
  });
}

// If run directly (not as cron), refresh immediately
if (require.main === module) {
  console.log('🔄 Starting cache refresh...');
  refreshCache()
    .then(() => {
      console.log('✅ Cache refresh completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cache refresh failed:', error);
      process.exit(1);
    });
}

module.exports = { refreshCache, getMidnightCST };

