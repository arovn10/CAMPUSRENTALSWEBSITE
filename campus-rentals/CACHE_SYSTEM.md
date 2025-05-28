# Campus Rentals Caching System

## Overview

The Campus Rentals website now includes a comprehensive caching system that:
- Downloads and stores all property images locally
- Caches property data, photos, and amenities
- Updates data automatically every 24 hours
- Provides fallback to live API if cache fails

## How It Works

### Data Caching
- **Location**: `.cache/` directory (git-ignored)
- **Duration**: 24 hours
- **Content**: Properties, photos metadata, and amenities data
- **Format**: JSON files with timestamps

### Image Caching
- **Location**: `public/cached-images/` directory (git-ignored)
- **Naming**: `property-{propertyId}-photo-{photoId}.{extension}`
- **Fallback**: CloudFront CDN if local image not available
- **Cleanup**: Automatic removal of images older than 48 hours

## API Endpoints

### `/api/cache` (GET)
Returns cache status information:
```json
{
  "isValid": true,
  "hasData": true,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "propertiesCount": 25,
  "photosCount": 150
}
```

### `/api/cache` (POST)
Refresh cache manually:
```json
{
  "action": "refresh"
}
```

### `/api/warmup` (GET)
Initialize cache if empty (useful for server startup):
```json
{
  "message": "Cache warmed up successfully",
  "propertiesCount": 25
}
```

## Usage

### In Components
Replace the old API imports:
```typescript
// Old
import { fetchProperties, fetchPropertyPhotos } from '@/utils/api';

// New
import { fetchProperties, fetchPropertyPhotos, getOptimizedImageUrl } from '@/utils/cachedApi';
```

### Image URLs
Use the optimized image URL function:
```typescript
const photos = await fetchPropertyPhotos(propertyId);
const imageUrl = getOptimizedImageUrl(photos[0]); // Returns cached path or CloudFront URL
```

## Administration

Visit `/admin/cache` to:
- View cache status
- Manually refresh cache
- Warm up cache
- Monitor cache health

## Server Deployment

### Initial Setup
1. Ensure cache directories exist (created automatically)
2. Call `/api/warmup` after deployment to initialize cache
3. Set up monitoring for cache health

### Environment Considerations
- **Development**: Cache works normally, files stored locally
- **Production**: Ensure sufficient disk space for cached images
- **Docker**: Mount cache directories as volumes for persistence

## Performance Benefits

### Before Caching
- Every page load fetched data from external API
- Images loaded from S3/CloudFront (external requests)
- Slower page loads, especially on poor connections

### After Caching
- Data fetched once per day from external API
- Images served locally (faster loading)
- Graceful fallback if cache fails
- Reduced external API calls by ~95%

## Monitoring

### Cache Health Indicators
- Cache validity (< 24 hours old)
- Data availability
- Image cache hit rate
- API fallback frequency

### Logs to Monitor
- Cache refresh operations
- Image download failures
- API fallback usage
- Cache directory cleanup

## Troubleshooting

### Cache Not Working
1. Check if `.cache/` directory exists and is writable
2. Verify API endpoints are accessible
3. Check server logs for cache errors
4. Try manual cache refresh via admin panel

### Images Not Loading
1. Check if `public/cached-images/` directory exists
2. Verify image download permissions
3. Check CloudFront fallback is working
4. Monitor disk space for image storage

### Performance Issues
1. Monitor cache directory size
2. Check cache cleanup is running
3. Verify 24-hour refresh cycle
4. Consider cache warming during off-peak hours

## File Structure

```
campus-rentals/
├── .cache/                     # Data cache (git-ignored)
│   ├── data.json              # Cached property data
│   └── metadata.json          # Cache timestamps
├── public/cached-images/       # Image cache (git-ignored)
│   └── property-*-photo-*.jpg # Cached property images
├── src/utils/
│   ├── cache.ts               # Cache utilities
│   ├── cachedApi.ts           # Cached API functions
│   └── api.ts                 # Original API functions
└── src/app/
    ├── api/cache/route.ts     # Cache management API
    ├── api/warmup/route.ts    # Cache initialization API
    └── admin/cache/page.tsx   # Cache admin interface
```

## Future Enhancements

- [ ] Cache compression for larger datasets
- [ ] Image optimization (WebP conversion)
- [ ] Selective cache invalidation
- [ ] Cache analytics and metrics
- [ ] Automated cache warming on deployment
- [ ] Cache distribution for multi-server setups 