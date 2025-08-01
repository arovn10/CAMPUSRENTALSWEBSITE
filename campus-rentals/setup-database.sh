#!/bin/bash

echo "🚀 Setting up Campus Rentals Investor Portal Database..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the campus-rentals directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "🌱 Seeding database with sample data..."
npx prisma db seed

echo "✅ Database setup complete!"
echo ""
echo "🎉 Your Campus Rentals Investor Portal is ready!"
echo ""
echo "📊 Sample users created:"
echo "   Admin: rovnerproperties@gmail.com / Celarev0319942002!"
echo "   Investor: srovner@dial-law.com / 15Saratoga!"
echo "   Sponsor: sponsor@campusrentals.com / Sponsor2024!"
echo ""
echo "🌐 Start the development server:"
echo "   npm run dev"
echo ""
echo "🔗 Access the investor portal at:"
echo "   http://localhost:3000/investors/login" 