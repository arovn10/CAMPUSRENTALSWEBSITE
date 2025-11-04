# Deal Photos Seeding Script

This script migrates photos from the old abode backend to the new deal photos system.

## Overview

The script:
1. Fetches all active direct investments from the database
2. For each investment, matches it to the old backend property using `propertyId`
3. Downloads photos from `https://abode-backend.onrender.com/api/photos/get/{propertyId}`
4. Uploads each photo to S3 using the investor S3 service
5. Creates `DealPhoto` records in the database

## Prerequisites

- Database must be accessible
- AWS S3 credentials must be configured in environment variables
- An admin user must exist in the database
- The old backend API must be accessible

## Usage

Run the script from the project root:

```bash
npm run seed:deal-photos
```

Or directly with tsx:

```bash
npx tsx scripts/seed-deal-photos.ts
```

## What It Does

- **Skips investments without photos** - If an investment's property has no photos in the old backend, it's skipped
- **Skips investments with existing photos** - If photos already exist for an investment, it's skipped (prevents duplicates)
- **Sets first photo as thumbnail** - The first photo uploaded becomes the thumbnail
- **Preserves photo order** - Uses `photoOrder` from the old backend if available
- **Preserves descriptions** - Copies photo descriptions from the old backend

## Output

The script provides detailed console output showing:
- Total investments found
- Progress for each investment
- Success/failure for each photo
- Final summary with totals

## Notes

- Only processes **direct investments** (not entity investments) since `DealPhoto` only references `Investment`
- Photos are organized in S3 under `investor-deals/deals/{investmentId}/`
- The script uses the first admin user found for the `uploadedBy` field
- Photos are downloaded and re-uploaded (not just copied), ensuring they're in the correct S3 location

