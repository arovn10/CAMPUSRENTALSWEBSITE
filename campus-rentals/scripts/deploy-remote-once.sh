#!/usr/bin/env bash
set -e

echo "🚀 Starting remote deployment..."

cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps || npm install --legacy-peer-deps

echo "🔨 Building application..."
npm run build || true

echo "🔄 Restarting application with PM2..."
pm2 restart campus-rentals || pm2 start npm --name "campus-rentals" -- start
pm2 save || true

echo "🔥 Warming up API..."
sleep 2
curl -sS http://localhost:3000/api/investors/properties | head -c 400 || true

echo "✅ Remote deployment complete."


