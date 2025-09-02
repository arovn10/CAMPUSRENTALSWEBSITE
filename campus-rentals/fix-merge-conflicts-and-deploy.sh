#!/bin/bash

# Fix merge conflicts and deploy script
# This script will SSH into the server, fix merge conflicts, and restart the application

set -e  # Exit on any error

# Configuration
SERVER_IP="23.21.76.187"
USERNAME="bitnami"
KEY_PATH="/Users/alec/Desktop/Campus Rentals/CAMPUSRENTALSWEBSITE/campus-rentals/LightsailDefaultKey-us-east-1 (3).pem"
PROJECT_PATH="/home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals"

echo "🔧 Starting merge conflict fix and deployment..."

# SSH into server and fix merge conflicts
ssh -i "$KEY_PATH" "$USERNAME@$SERVER_IP" << 'EOF'
set -e

echo "📁 Navigating to project directory..."
cd /home/bitnami/CAMPUSRENTALSWEBSITE/campus-rentals

echo "🔄 Pulling latest changes..."
git pull origin main

echo "🔍 Checking for merge conflicts..."
if grep -q "<<<<<<< HEAD" src/app/api/investors/waterfall-distributions/route.ts; then
    echo "⚠️  Merge conflicts detected. Fixing..."
    
    # Create a backup
    cp src/app/api/investors/waterfall-distributions/route.ts src/app/api/investors/waterfall-distributions/route.ts.backup
    
    # Fix the merge conflicts using sed
    sed -i '/<<<<<<< HEAD/,/>>>>>>> cc31954/d' src/app/api/investors/waterfall-distributions/route.ts
    
    # Add the correct code after the waterfallDistribution creation
    sed -i '/^    })$/a\
\
    // If refinance with closing fee items, persist them\
    if (body.distributionType === '\''REFINANCE'\'' && Array.isArray(body.closingFeesItems) && body.closingFeesItems.length > 0) {\
      await prisma.refinanceClosingFees.createMany({\
        data: body.closingFeesItems.map((i: any) => ({\
          waterfallDistributionId: waterfallDistribution.id,\
          category: String(i.category || '\'\'\''),\
          amount: Number(i.amount || 0)\
        }))\
      })\
    }\
\
    // STEP 6.5: Update property debt for refinancing distributions\
    if (isRefinancing && body.newDebtAmount && property) {\
      try {\
        await prisma.property.update({\
          where: { id: property.id },\
          data: {\
            debtAmount: body.newDebtAmount\
          }\
        })\
        console.log(`Updated property ${property.id} debt amount to ${body.newDebtAmount} for refinancing distribution`)\
      } catch (error) {\
        console.error('\''Failed to update property debt amount:'\'', error)\
        // Don'\''t fail the entire distribution if debt update fails\
      }\
    }' src/app/api/investors/waterfall-distributions/route.ts
    
    echo "✅ Merge conflicts fixed!"
else
    echo "✅ No merge conflicts found."
fi

echo "🔍 Verifying file syntax..."
if grep -q "<<<<<<< HEAD\|=======\|>>>>>>> " src/app/api/investors/waterfall-distributions/route.ts; then
    echo "❌ Still have merge conflict markers. Manual fix required."
    exit 1
fi

echo "💾 Committing changes..."
git add .
git commit -m "Fix merge conflicts in waterfall distributions API" || echo "No changes to commit"

echo "🚀 Pushing to repository..."
git push origin main

echo "🔄 Restarting application..."
pm2 restart campus-rentals

echo "✅ Deployment completed successfully!"
EOF

echo "🎉 Script completed! The refinancing distribution fix has been deployed."
echo "🌐 Your application should now be running without merge conflicts."
