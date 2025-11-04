# Deal Photos Setup Guide

This guide explains how to use the deal photo management system for investments.

## Overview

The deal photo system allows you to:
- Upload multiple photos per investment/deal
- Organize photos by deal (each deal has its own folder in S3)
- Set a thumbnail photo for each deal
- Reorder photos by dragging or using up/down buttons
- Delete photos
- Add descriptions to photos

## Database Migration

First, run the database migration to create the `deal_photos` table:

```bash
# Apply the migration
psql -U your_user -d your_database -f prisma/migrations/002_add_deal_photos.sql

# Or use Prisma
npx prisma migrate dev --name add_deal_photos
```

## Features

### Photo Organization
- Photos are stored in S3 with the structure: `investor-deals/deals/{investmentId}/photo.jpg`
- Each deal gets its own folder for easy management
- Photos are tracked in the database with metadata

### Thumbnail Selection
- One photo per deal can be set as the thumbnail
- The thumbnail photo is marked with a star icon
- The first uploaded photo automatically becomes the thumbnail
- Admins/Managers can change the thumbnail by clicking the star icon

### Photo Ordering
- Photos can be reordered using up/down arrows
- Order is saved in the `displayOrder` field
- Photos are displayed in order on the deal page

### Access Control
- **Investors**: Can upload photos to their own investments
- **Admins & Managers**: Can upload, delete, and reorder photos for any investment
- All users can view photos for investments they have access to

## API Endpoints

### GET /api/investors/deal-photos?investmentId=xxx
Get all photos for an investment.

**Response:**
```json
{
  "photos": [
    {
      "id": "photo-id",
      "photoUrl": "https://...",
      "fileName": "photo.jpg",
      "description": "Property exterior",
      "displayOrder": 0,
      "isThumbnail": true,
      "fileSize": 245678,
      "mimeType": "image/jpeg",
      "uploadedBy": "user-id",
      "uploader": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/investors/deal-photos
Upload a new photo.

**Body (FormData):**
- `file`: File (required)
- `investmentId`: string (required)
- `description`: string (optional)

### PUT /api/investors/deal-photos/[photoId]
Update photo metadata.

**Body (JSON):**
- `description`: string (optional)
- `displayOrder`: number (optional)
- `isThumbnail`: boolean (optional)

### DELETE /api/investors/deal-photos/[photoId]
Delete a photo.

### PUT /api/investors/deal-photos/reorder
Update photo order.

**Body (JSON):**
```json
{
  "photoIds": ["photo-id-1", "photo-id-2", "photo-id-3"]
}
```

## Usage in Investment Detail Page

The `DealPhotoManager` component is already integrated into the investment detail page. It automatically:
- Loads photos for the current investment
- Displays them in a grid layout
- Provides upload, delete, reorder, and thumbnail selection functionality

## Displaying Thumbnail on Deal List

To display the thumbnail photo on a deal list/card:

```typescript
// Fetch the thumbnail photo for an investment
const getThumbnailPhoto = async (investmentId: string) => {
  const response = await fetch(`/api/investors/deal-photos?investmentId=${investmentId}`)
  const data = await response.json()
  const thumbnail = data.photos.find((p: DealPhoto) => p.isThumbnail)
  return thumbnail?.photoUrl || null
}
```

## S3 File Organization

Photos are organized in S3 as follows:
```
campusrentalswebsitebucket/
└── investor-deals/
    └── deals/
        ├── investment-id-1/
        │   ├── photo_1234567890_abc123.jpg
        │   └── photo_1234567891_def456.jpg
        └── investment-id-2/
            ├── photo_1234567892_ghi789.jpg
            └── photo_1234567893_jkl012.jpg
```

Each investment gets its own folder, making it easy to:
- Manage photos per deal
- Clean up photos when a deal is deleted
- Organize files in S3

## Troubleshooting

### Photos not uploading
- Check AWS credentials in `.env`
- Verify S3 bucket permissions
- Check file size (max 10MB)
- Ensure file is an image type

### Photos not displaying
- Check photo URL is accessible
- Verify CORS configuration on S3 bucket
- Check browser console for errors

### Thumbnail not updating
- Ensure only one photo has `isThumbnail: true`
- Check API response for errors
- Verify user has admin/manager permissions

## Next Steps

1. Run the database migration
2. Test photo upload on an investment detail page
3. Set up thumbnail display on deal list/cards if needed
4. Configure S3 bucket CORS if uploading directly from browser

