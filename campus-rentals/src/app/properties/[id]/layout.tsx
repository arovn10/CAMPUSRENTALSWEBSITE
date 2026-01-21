import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { loadDataFromCache, isCacheValid } from '@/utils/serverCache'
import { getOptimizedImageUrl } from '@/utils/clientApi'
import { resolveSiteUrl } from '@/utils/siteUrl'

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const propertyId = Number(params.id)
  
  try {
    // First try to get property from new database (for DealPhoto access)
    let propertyFromDb = null
    let imageUrl: string | undefined
    
    try {
      propertyFromDb = await prisma.property.findUnique({
        where: { propertyId: propertyId },
        select: {
          id: true,
          name: true,
          address: true,
          description: true,
          bedrooms: true,
          bathrooms: true,
          price: true,
        }
      })

      // If found in DB, try to get DealPhoto thumbnail
      if (propertyFromDb) {
        const thumbnail = await prisma.dealPhoto.findFirst({
          where: {
            propertyId: propertyFromDb.id,
            isThumbnail: true
          },
          orderBy: [
            { displayOrder: 'asc' },
            { createdAt: 'asc' }
          ],
          select: {
            photoUrl: true
          }
        })

        if (thumbnail) {
          imageUrl = thumbnail.photoUrl
        } else {
          // Try first photo by display order
          const firstPhoto = await prisma.dealPhoto.findFirst({
            where: {
              propertyId: propertyFromDb.id
            },
            orderBy: [
              { displayOrder: 'asc' },
              { createdAt: 'asc' }
            ],
            select: {
              photoUrl: true
            }
          })
          if (firstPhoto) {
            imageUrl = firstPhoto.photoUrl
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from database:', error)
    }

    // Fetch property data from server-side cache (more reliable)
    let property = null
    if (isCacheValid()) {
      const cachedData = loadDataFromCache()
      if (cachedData) {
        property = cachedData.properties.find(p => p.property_id === propertyId)
        
        // Get photo from cache if not already found
        if (!imageUrl && property && cachedData.photos[propertyId] && cachedData.photos[propertyId].length > 0) {
          const firstPhoto = cachedData.photos[propertyId][0]
          if (firstPhoto && firstPhoto.photoLink) {
            imageUrl = getOptimizedImageUrl(firstPhoto as any)
          }
        }
      }
    }
    
    if (!property && !propertyFromDb) {
      return {
        title: 'Property Not Found',
        description: 'The requested property could not be found.',
      }
    }

    // Use property from DB if available, otherwise use old API property
    const propertyName = propertyFromDb?.name || property?.name || 'Property'
    const propertyAddress = propertyFromDb?.address || property?.address || ''
    const propertyDescription = propertyFromDb?.description || property?.description || ''
    const bedrooms = propertyFromDb?.bedrooms || property?.bedrooms || 0
    const bathrooms = propertyFromDb?.bathrooms || property?.bathrooms || 0
    const price = propertyFromDb?.price || property?.price || 0

    // Fallback to old photo system if no DealPhoto thumbnail
    if (!imageUrl && property) {
      try {
        const photos = await fetchPropertyPhotos(propertyId)
        if (photos && photos.length > 0) {
          imageUrl = getOptimizedImageUrl(photos[0])
        }
      } catch (error) {
        console.error('Error fetching photos from old system:', error)
      }
    }

    const siteUrl = resolveSiteUrl()
    const propertyUrl = `${siteUrl}/properties/${propertyId}`
    const description = propertyDescription || `${bedrooms} bed, ${bathrooms} bath property in ${propertyAddress} - $${price}/month`

    // Determine location-based keywords
    const isNewOrleans = propertyAddress?.toLowerCase().includes('new orleans') || 
                         propertyAddress?.toLowerCase().includes('nola') ||
                         propertyName?.toLowerCase().includes('new orleans')
    const isBocaRaton = propertyAddress?.toLowerCase().includes('boca raton') ||
                        propertyAddress?.toLowerCase().includes('boca') ||
                        propertyName?.toLowerCase().includes('boca')
    
    const locationKeywords = isNewOrleans 
      ? 'Tulane off-campus housing, student apartments near Tulane, Tulane student housing'
      : isBocaRaton
      ? 'FAU off-campus housing, student apartments near FAU, FAU student housing'
      : 'off-campus student housing, student apartments'
    
    const seoDescription = `${bedrooms} bed, ${bathrooms} bath ${locationKeywords} in ${propertyAddress}. ${propertyDescription || 'Modern student housing with premium amenities.'} View photos, pricing, and amenities.`
    
    const seoTitle = `${propertyName} | ${locationKeywords} | Campus Rentals`

    const metadata: Metadata = {
      title: seoTitle,
      description: seoDescription,
      keywords: [
        locationKeywords,
        propertyAddress || '',
        `${bedrooms} bedroom student apartment`,
        `${bathrooms} bathroom student housing`,
        'off-campus housing',
        'student rentals',
        'college housing',
        isNewOrleans ? 'Tulane University housing' : '',
        isBocaRaton ? 'Florida Atlantic University housing' : '',
      ].filter(Boolean),
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        url: propertyUrl,
        siteName: 'Campus Rentals LLC',
        images: imageUrl ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${propertyName} - ${locationKeywords}`,
          }
        ] : [],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: seoDescription,
        images: imageUrl ? [imageUrl] : [],
      },
      alternates: {
        canonical: propertyUrl,
      },
    }

    return metadata
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Property Details - Campus Rentals',
      description: 'View property details on Campus Rentals',
    }
  }
}

export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

