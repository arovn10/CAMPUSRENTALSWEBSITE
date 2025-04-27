#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository (replace with your actual repository URL)
git clone https://github.com/yourusername/campus-rentals.git
cd campus-rentals

# Install dependencies
npm install

# Build the application
npm run build

# Start the application with PM2
pm2 start npm --name "campus-rentals" -- start

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Set up Nginx as a reverse proxy
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure Nginx (we'll create this file next)
sudo nano /etc/nginx/sites-available/campus-rentals 