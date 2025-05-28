#!/bin/bash

echo "🔄 Restarting Campus Rentals application..."

# Stop the current PM2 process
pm2 stop campus-rentals 2>/dev/null || echo "No existing process to stop"

# Delete the process from PM2
pm2 delete campus-rentals 2>/dev/null || echo "No existing process to delete"

# Clear any potential cache issues
rm -rf .cache/* 2>/dev/null || echo "No cache to clear"

# Start the application fresh
pm2 start npm --name "campus-rentals" -- start

# Show status
pm2 status

echo "✅ Application restart completed!" 