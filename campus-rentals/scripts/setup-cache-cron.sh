#!/bin/bash

# Setup script for cache refresh cron job
# This sets up a cron job to refresh the cache at midnight CST

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_SCRIPT="$SCRIPT_DIR/cache-refresh-cron.js"

echo "🔧 Setting up cache refresh cron job..."

# Make the cron script executable
chmod +x "$CRON_SCRIPT"

# Check if using PM2
if command -v pm2 &> /dev/null; then
    echo "📦 Using PM2 for scheduled cache refresh..."
    
    # Create PM2 ecosystem config for cron
    cat > "$PROJECT_DIR/ecosystem.cache-cron.config.js" << EOF
module.exports = {
  apps: [{
    name: 'cache-refresh-cron',
    script: '$CRON_SCRIPT',
    cron_restart: '0 0 * * *', // Midnight CST (6 AM UTC)
    autorestart: false,
    watch: false,
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com',
      CRON_SECRET: process.env.CRON_SECRET || 'campus-rentals-cache-refresh'
    }
  }]
};
EOF

    echo "✅ PM2 ecosystem config created at: $PROJECT_DIR/ecosystem.cache-cron.config.js"
    echo ""
    echo "To start the cron job, run:"
    echo "  pm2 start ecosystem.cache-cron.config.js"
    echo ""
    echo "To check status:"
    echo "  pm2 status cache-refresh-cron"
    
else
    echo "📅 Setting up system cron job..."
    
    # Add to crontab (midnight CST = 6 AM UTC)
    CRON_JOB="0 6 * * * cd $PROJECT_DIR && /usr/bin/node $CRON_SCRIPT >> /tmp/cache-refresh.log 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "$CRON_SCRIPT"; then
        echo "⚠️  Cron job already exists"
    else
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo "✅ Cron job added successfully"
    fi
    
    echo ""
    echo "Current crontab:"
    crontab -l | grep "$CRON_SCRIPT" || echo "No cache refresh cron job found"
fi

echo ""
echo "✅ Cache refresh cron setup complete!"
echo ""
echo "The cache will refresh automatically at midnight CST (6 AM UTC) every day."

