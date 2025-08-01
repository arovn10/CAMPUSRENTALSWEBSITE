#!/bin/bash

# Deploy Photo Fix for Campus Rentals
# This script uploads the updated files that fix the photo pulling system

echo "🚀 Deploying photo fix to Campus Rentals..."

# Upload the updated API files
echo "📤 Uploading API files..."
scp -i "LightsailDefaultKey-us-east-1.pem" \
  src/app/api/properties/route.ts \
  src/app/api/investors/properties/route.ts \
  src/components/PropertyCard.tsx \
  src/types/property.ts \
  ubuntu@3.250.201.113:/home/ubuntu/campus-rentals/src/

# Upload the updated utils
echo "📤 Uploading utility files..."
scp -i "LightsailDefaultKey-us-east-1.pem" \
  src/utils/propertyPhotos.ts \
  src/utils/clientApi.ts \
  ubuntu@3.250.201.113:/home/ubuntu/campus-rentals/src/utils/

# Upload the updated types
echo "📤 Uploading type definitions..."
scp -i "LightsailDefaultKey-us-east-1.pem" \
  src/types/property.ts \
  ubuntu@3.250.201.113:/home/ubuntu/campus-rentals/src/types/

echo "✅ Files uploaded successfully!"
echo ""
echo "📝 Next steps on the server:"
echo "   1. SSH into the server: ssh -i 'LightsailDefaultKey-us-east-1.pem' ubuntu@3.250.201.113"
echo "   2. Navigate to project: cd /home/ubuntu/campus-rentals"
echo "   3. Install dependencies: npm install"
echo "   4. Build the application: npm run build"
echo "   5. Restart the application: pm2 restart campus-rentals"
echo ""
echo "🎉 Photo system should now work correctly!" 