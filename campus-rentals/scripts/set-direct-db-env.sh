#!/bin/bash
# Script to set direct database environment variables on the server
# Run this ON THE SERVER after SSHing in

set -e

# Navigate to project directory
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals || exit 1

# Database credentials
DB_HOST="ls-96cf74c298a48ae39bf159a9fe40a260e5d03047.czdn1nw8kizq.us-east-1.rds.amazonaws.com"
DB_USER="dbmasteruser"
DB_PASSWORD="~D=Otib<.[+WsS=O9(OMM^9V{NX~49%v"
DB_NAME="campus_rentals"
DB_PORT="5432"

echo "🔧 Setting Direct Database Environment Variables"
echo "=================================================="
echo ""

# Backup current .env
if [ -f .env ]; then
    echo "💾 Backing up current .env..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
    echo ""
fi

# Function to set or update env variable in .env file
set_env_var() {
    local var_name=$1
    local var_value=$2
    
    # Escape special characters in value for sed
    local escaped_value=$(printf '%s\n' "$var_value" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    if grep -q "^${var_name}=" .env 2>/dev/null; then
        # Variable exists, update it
        sed -i.bak "s|^${var_name}=.*|${var_name}=\"${escaped_value}\"|" .env
        echo "✅ Updated ${var_name}"
    else
        # Variable doesn't exist, append it
        echo "${var_name}=\"${var_value}\"" >> .env
        echo "✅ Added ${var_name}"
    fi
}

# Set all database variables
echo "📝 Setting environment variables..."
set_env_var "DB_HOST" "$DB_HOST"
set_env_var "DB_USER" "$DB_USER"
set_env_var "DB_PASSWORD" "$DB_PASSWORD"
set_env_var "DB_NAME" "$DB_NAME"
set_env_var "DB_PORT" "$DB_PORT"

echo ""
echo "✅ All environment variables set successfully!"
echo ""
echo "📋 Summary:"
echo "   DB_HOST: $DB_HOST"
echo "   DB_USER: $DB_USER"
echo "   DB_NAME: $DB_NAME"
echo "   DB_PORT: $DB_PORT"
echo ""
echo "⚠️  Note: Restart the Next.js application for changes to take effect"
echo "   Run: pm2 restart all  (or your restart command)"

