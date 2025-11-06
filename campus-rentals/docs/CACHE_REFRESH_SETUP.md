# Cache Refresh System Setup

## Overview

The cache refresh system automatically refreshes all property data, photos, amenities, and geocoded coordinates at midnight CST every day. This ensures the site is always fast and up-to-date.

## Features

- **Automatic Refresh**: Runs at midnight CST (6 AM UTC) daily
- **Geocoded Addresses**: All property coordinates are cached and reused
- **Fast Performance**: Cache stays valid until refresh, ensuring lightning-fast load times
- **Comprehensive Data**: Caches properties, photos, amenities, and coordinates

## Setup Instructions

### Option 1: Using PM2 (Recommended)

1. **Start the cron job:**
   ```bash
   cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals
   pm2 start ecosystem.cache-cron.config.js
   ```

2. **Check status:**
   ```bash
   pm2 status cache-refresh-cron
   pm2 logs cache-refresh-cron
   ```

3. **Save PM2 configuration:**
   ```bash
   pm2 save
   ```

### Option 2: Using System Cron

1. **Make the script executable:**
   ```bash
   chmod +x scripts/cache-refresh-cron.js
   ```

2. **Add to crontab:**
   ```bash
   crontab -e
   ```

3. **Add this line (midnight CST = 6 AM UTC):**
   ```
   0 6 * * * cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals && /usr/bin/node scripts/cache-refresh-cron.js >> /tmp/cache-refresh.log 2>&1
   ```

## Environment Variables

Add to your `.env` file:

```bash
CRON_SECRET=campus-rentals-cache-refresh  # Change this to a secure random string
NEXT_PUBLIC_SITE_URL=https://campusrentalsllc.com
```

## Manual Cache Refresh

You can manually trigger a cache refresh:

```bash
curl -X POST https://campusrentalsllc.com/api/cache/refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or via GET:
```bash
curl https://campusrentalsllc.com/api/cache/refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Cache Structure

The cache includes:
- **Properties**: All property data with bedrooms, bathrooms, prices, descriptions, etc.
- **Photos**: All property photos organized by property ID
- **Amenities**: Property amenities data
- **Coordinates**: Geocoded addresses mapped to latitude/longitude

## Cache Validity

- Cache is valid for 25 hours (gives buffer for midnight refresh)
- Cache stays valid until the scheduled refresh runs
- If refresh fails, old cache continues to serve (stale-while-revalidate)

## Monitoring

Check cache status:
```bash
# View PM2 logs
pm2 logs cache-refresh-cron

# Check cache files
ls -lh .cache/
cat .cache/metadata.json
```

## Troubleshooting

1. **Cache not refreshing:**
   - Check PM2 status: `pm2 status`
   - Check logs: `pm2 logs cache-refresh-cron`
   - Verify CRON_SECRET matches in .env and script

2. **Coordinates not cached:**
   - Check that properties have addresses
   - Verify geocoding API key is set
   - Check logs for geocoding errors

3. **Performance issues:**
   - Verify cache files exist in `.cache/` directory
   - Check cache metadata timestamp
   - Ensure cache refresh completed successfully

