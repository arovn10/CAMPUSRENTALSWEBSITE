# Investor Dashboard Photo Upload Guide

This guide explains how to use the separate S3 service for uploading deal photos in the investor dashboard.

## Overview

The investor dashboard has a dedicated S3 service (`investorS3Service.ts`) that:
- Stores photos in the `investor-deals/` prefix for isolation
- Organizes photos by investment ID or deal ID
- Provides public URLs for easy access
- Is completely separate from the main website's file upload system

## API Endpoint

**POST** `/api/investors/photos`

### Authentication

Requires authentication token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Permissions

- **Investors**: Can upload photos for their own investments
- **Admins & Managers**: Can upload photos for any investment

### Request Body (FormData)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG, GIF, WebP, SVG) |
| `investmentId` | String | No | Investment ID to associate photo with |
| `dealId` | String | No | Deal ID to associate photo with |
| `description` | String | No | Optional description of the photo |

### File Requirements

- **Allowed types**: JPEG, JPG, PNG, GIF, WebP, SVG
- **Max size**: 10MB
- **Content-Type**: Must be a valid image MIME type

### Response

**Success (201 Created)**:
```json
{
  "success": true,
  "photo": {
    "url": "https://campusrentalswebsitebucket.s3.us-east-2.amazonaws.com/investor-deals/investments/inv-123/photo_1234567890_abc123.jpg",
    "key": "investor-deals/investments/inv-123/photo_1234567890_abc123.jpg",
    "fileName": "my-photo.jpg",
    "size": 245678,
    "contentType": "image/jpeg",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Invalid file type. Only images are allowed."
}
```

**Error (403 Forbidden)**:
```json
{
  "error": "Investment not found or access denied"
}
```

## Example Usage

### JavaScript/TypeScript (Frontend)

```typescript
async function uploadDealPhoto(file: File, investmentId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('investmentId', investmentId)
  formData.append('description', 'Property photo from inspection')

  const response = await fetch('/api/investors/photos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  })

  if (response.ok) {
    const data = await response.json()
    console.log('Photo uploaded:', data.photo.url)
    return data.photo
  } else {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }
}

// Usage
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]
uploadDealPhoto(file, 'investment-123')
  .then(photo => {
    // Use photo.url to display the image
    console.log('Photo URL:', photo.url)
  })
  .catch(error => {
    console.error('Upload error:', error)
  })
```

### React Component Example

```tsx
import { useState } from 'react'

function DealPhotoUpload({ investmentId }: { investmentId: string }) {
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('investmentId', investmentId)

    try {
      const response = await fetch('/api/investors/photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setPhotoUrl(data.photo.url)
        alert('Photo uploaded successfully!')
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.error}`)
      }
    } catch (error) {
      alert('Error uploading photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {photoUrl && (
        <img src={photoUrl} alt="Uploaded photo" style={{ maxWidth: '300px' }} />
      )}
    </div>
  )
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/investors/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/photo.jpg" \
  -F "investmentId=investment-123" \
  -F "description=Property exterior view"
```

## File Organization in S3

Photos are organized by investment or deal ID:

```
investor-deals/
├── investments/
│   └── investment-123/
│       ├── property_photo_1234567890_abc123.jpg
│       └── interior_1234567890_def456.jpg
├── deals/
│   └── deal-456/
│       └── photo_1234567890_ghi789.jpg
└── general/
    └── photo_1234567890_jkl012.jpg
```

## Deleting Photos

**DELETE** `/api/investors/photos`

Only Admins and Managers can delete photos.

```typescript
async function deletePhoto(key: string) {
  const response = await fetch('/api/investors/photos', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key })
  })

  if (response.ok) {
    console.log('Photo deleted successfully')
  }
}
```

## Listing Photos

**GET** `/api/investors/photos?investmentId=xxx`

```typescript
async function getInvestmentPhotos(investmentId: string) {
  const response = await fetch(
    `/api/investors/photos?investmentId=${investmentId}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  )

  if (response.ok) {
    const data = await response.json()
    return data.photos
  }
}
```

## Integration with Investment Detail Page

To integrate with the existing investment detail page:

1. Add a file input for photo uploads
2. Call the upload API when a file is selected
3. Store the returned URL in your component state
4. Display the photo using the URL

Example integration in `investments/[id]/page.tsx`:

```tsx
const [dealPhotos, setDealPhotos] = useState<string[]>([])

const handlePhotoUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('investmentId', params.id)

  const response = await fetch('/api/investors/photos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  })

  if (response.ok) {
    const data = await response.json()
    setDealPhotos([...dealPhotos, data.photo.url])
  }
}
```

## Notes

- Photos are automatically made public (ACL: public-read) for easy access
- File names are sanitized and made unique with timestamps
- The service uses the same S3 bucket but with the `investor-deals/` prefix for isolation
- Photos are organized by investment ID or deal ID for easy management
- Maximum file size is 10MB per photo

