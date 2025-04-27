#!/bin/bash

# Exit on error
set -e

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js and npm
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install Git
echo "Installing Git..."
sudo apt-get install -y git

# Install PM2 for process management
echo "Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "Setting up application directory..."
mkdir -p /var/www/campus-rentals
cd /var/www/campus-rentals

# Clone your repository
echo "Cloning repository..."
git clone https://github.com/arovn10/CAMPUSRENTALSWEBSITE.git .
cd campus-rentals

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Start the application with PM2
echo "Starting application with PM2..."
pm2 start npm --name "campus-rentals" -- start

# Configure PM2 to start on boot
echo "Configuring PM2 startup..."
pm2 startup
pm2 save

# Install and configure Nginx
echo "Installing and configuring Nginx..."
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx configuration
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/campus-rentals << EOF
server {
    listen 80;
    server_name campusrentalsllc.com www.campusrentalsllc.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Add security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
}
EOF

# Enable the site
echo "Enabling Nginx site..."
sudo ln -s /etc/nginx/sites-available/campus-rentals /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up firewall
echo "Configuring firewall..."
sudo ufw allow 80
sudo ufw allow 22
sudo ufw --force enable

echo "Deployment completed successfully!"
echo "Your application should now be running at http://your-instance-ip"
echo "Next steps:"
echo "1. Update your DNS to point to this instance's IP address"
echo "2. Set up SSL certificate (recommended)"
echo "3. Configure environment variables if needed" 