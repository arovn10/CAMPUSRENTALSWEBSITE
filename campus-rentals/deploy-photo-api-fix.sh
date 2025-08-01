#!/bin/bash

# Deploy Photo API Fix for Campus Rentals
# This script uploads the updated files that fix the photo API system

echo "🚀 Deploying photo API fix to Campus Rentals..."

# Upload the updated API files
echo "📤 Uploading API files..."
scp -i "LightsailDefaultKey-us-east-1.pem" \
  src/app/api/properties/route.ts \
  src/components/PropertyCard.tsx \
  ubuntu@3.250.201.113:/home/ubuntu/campus-rentals/src/

# Upload the updated utils
echo "📤 Uploading utility files..."
scp -i "LightsailDefaultKey-us-east-1.pem" \
  src/utils/clientApi.ts \
  ubuntu@3.250.201.113:/home/ubuntu/campus-rentals/src/utils/

echo "✅ Files uploaded successfully!"
echo ""
echo "📝 Next steps on the server:"
echo "   1. SSH into the server: ssh -i 'LightsailDefaultKey-us-east-1.pem' ubuntu@3.250.201.113"
echo "   2. Navigate to project: cd /home/ubuntu/campus-rentals"
echo "   3. Install dependencies: npm install"
echo "   4. Build the application: npm run build"
echo "   5. Restart the application: pm2 restart campus-rentals"
echo ""
echo "🎉 Photo API system should now work correctly!"
echo "   - Properties API returns properties without photos"
echo "   - PropertyCard fetches photos via /api/photos/{propertyId}"
echo "   - Photos are properly cached and optimized" 