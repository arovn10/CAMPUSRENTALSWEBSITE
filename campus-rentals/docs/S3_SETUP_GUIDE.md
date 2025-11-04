# S3 Bucket Setup Guide for Campus Rentals Website

This guide walks you through setting up AWS S3 for photo storage for both the main website and the investor dashboard.

## Overview

The application uses two separate S3 services:

1. **Main Website S3 Service** (`s3Service.ts`) - For general file uploads (documents, images, etc.)
2. **Investor Dashboard S3 Service** (`investorS3Service.ts`) - Dedicated service for investor deal photos

Both services use the same S3 bucket (`campusrentalswebsitebucket`) but with different prefixes:
- Main website: Direct uploads to category folders (e.g., `images/`, `documents/`)
- Investor photos: Uploads to `investor-deals/` prefix for isolation

## Prerequisites

1. AWS Account with S3 access
2. IAM user with S3 permissions
3. S3 bucket: `campusrentalswebsitebucket` (or your preferred name)

## Step 1: Create S3 Bucket

1. Log in to AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Configure:
   - **Bucket name**: `campusrentalswebsitebucket`
   - **AWS Region**: `us-east-2` (or your preferred region)
   - **Object Ownership**: ACLs enabled (for public-read access to photos)
   - **Block Public Access**: 
     - Uncheck "Block all public access" if you want public photos
     - Or keep it checked and use signed URLs for private files
   - **Versioning**: Optional (recommended for production)
   - **Encryption**: Enable server-side encryption (recommended)

## Step 2: Create IAM User and Policy

### Create IAM User

1. Go to IAM Console → Users
2. Click "Create user"
3. Name: `campus-rentals-s3-user`
4. Enable "Programmatic access"
5. Click "Next"

### Create IAM Policy

1. In IAM Console → Policies → Create policy
2. Click "JSON" tab
3. Paste the following policy (replace `campusrentalswebsitebucket` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::campusrentalswebsitebucket",
        "arn:aws:s3:::campusrentalswebsitebucket/*"
      ]
    }
  ]
}
```

4. Name: `CampusRentalsS3Policy`
5. Click "Create policy"

### Attach Policy to User

1. Go back to your IAM user
2. Click "Add permissions" → "Attach policies directly"
3. Search for `CampusRentalsS3Policy`
4. Select it and click "Next" → "Add permissions"

### Get Access Keys

1. Go to your IAM user → Security credentials tab
2. Click "Create access key"
3. Choose "Application running outside AWS"
4. Click "Next" → "Create access key"
5. **IMPORTANT**: Save both:
   - Access Key ID
   - Secret Access Key (shown only once!)

## Step 3: Configure Bucket CORS (for Browser Uploads)

If you plan to upload directly from the browser, configure CORS:

1. Go to your S3 bucket → Permissions tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click "Edit" and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace `yourdomain.com` with your actual domain.

## Step 4: Configure Environment Variables

### Option A: Same Bucket, Same Credentials (Recommended)

Edit your `.env` file:

```env
# AWS Configuration (Main Website)
NEXT_PUBLIC_AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
NEXT_PUBLIC_AWS_REGION="us-east-2"
NEXT_PUBLIC_S3_BUCKET_NAME="campusrentalswebsitebucket"
```

**Security Note**: Never put `AWS_SECRET_ACCESS_KEY` in `NEXT_PUBLIC_*` variables. Secrets exposed to the client are a security risk.

### Option B: Separate Credentials for Investor Dashboard

If you want separate credentials for investor photos:

```env
# Main Website AWS Configuration
NEXT_PUBLIC_AWS_ACCESS_KEY_ID="main-access-key-id"
AWS_SECRET_ACCESS_KEY="main-secret-key"
NEXT_PUBLIC_AWS_REGION="us-east-2"
NEXT_PUBLIC_S3_BUCKET_NAME="campusrentalswebsitebucket"

# Investor Dashboard S3 Configuration (Optional)
INVESTOR_AWS_ACCESS_KEY_ID="investor-access-key-id"
INVESTOR_AWS_SECRET_ACCESS_KEY="investor-secret-key"
INVESTOR_AWS_REGION="us-east-2"
INVESTOR_S3_BUCKET_NAME="campusrentalswebsitebucket"
```

## Step 5: Test the Setup

### Test Main Website Upload

1. Upload a file through the main website file upload feature
2. Check S3 bucket - file should appear in appropriate folder (e.g., `images/`, `documents/`)

### Test Investor Photo Upload

Use the investor dashboard photo upload API:

```bash
curl -X POST http://localhost:3000/api/investors/photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@photo.jpg" \
  -F "investmentId=investment-123" \
  -F "description=Deal photo"
```

Check S3 bucket - photo should appear in `investor-deals/investments/investment-123/` folder.

## File Organization

### Main Website Files
```
campusrentalswebsitebucket/
├── images/
│   └── photo_1234567890_abc123.jpg
├── documents/
│   └── doc_1234567890_def456.pdf
└── videos/
    └── video_1234567890_ghi789.mp4
```

### Investor Dashboard Photos
```
campusrentalswebsitebucket/
└── investor-deals/
    ├── investments/
    │   └── investment-123/
    │       └── deal_photo_1234567890_xyz789.jpg
    ├── deals/
    │   └── deal-456/
    │       └── property_photo_1234567890_abc123.jpg
    └── general/
        └── photo_1234567890_def456.jpg
```

## Security Best Practices

1. **Never expose secrets**: Keep `AWS_SECRET_ACCESS_KEY` server-side only
2. **Use IAM policies**: Limit permissions to only what's needed
3. **Enable encryption**: Use S3 server-side encryption
4. **Monitor access**: Enable CloudTrail for S3 access logging
5. **Use signed URLs**: For private files, use signed URLs instead of public-read
6. **Bucket policies**: Consider adding bucket policies for additional security

## Bucket Policy Example (Optional)

For additional security, you can add a bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::campusrentalswebsitebucket/investor-deals/*"
    },
    {
      "Sid": "DenyInsecureConnections",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::campusrentalswebsitebucket",
        "arn:aws:s3:::campusrentalswebsitebucket/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

This policy:
- Allows public read access to investor-deals folder (for photos)
- Denies all non-HTTPS connections

## Troubleshooting

### "Access Denied" Errors
- Check IAM user has correct permissions
- Verify bucket name matches in environment variables
- Ensure access keys are correct

### "Bucket Not Found" Errors
- Verify bucket name is correct
- Check region matches
- Ensure bucket exists in AWS console

### Photos Not Showing
- Check CORS configuration
- Verify file is uploaded successfully
- Check browser console for errors
- Verify public-read ACL is set (if using public URLs)

## API Endpoints

### Investor Photo Upload
- **POST** `/api/investors/photos`
- **Body**: FormData with `file`, `investmentId` (optional), `dealId` (optional), `description` (optional)
- **Auth**: Required (Investor, Admin, or Manager)

### Investor Photo Delete
- **DELETE** `/api/investors/photos`
- **Body**: JSON with `key` or `url`
- **Auth**: Required (Admin or Manager only)

### Investor Photo List
- **GET** `/api/investors/photos?investmentId=xxx` or `?dealId=xxx`
- **Auth**: Required

## Support

For issues or questions, check:
- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- IAM Policy Documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html

