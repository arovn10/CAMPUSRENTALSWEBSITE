import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { fetchProperties } from '@/utils/clientApi'
import { fetchPropertyPhotos } from '@/utils/clientApi'
import { getOptimizedImageUrl } from '@/utils/clientApi'

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

    // Fetch property data from old API (for fallback)
    const properties = await fetchProperties()
    const property = properties.find(p => p.property_id === propertyId)
    
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com'
    const propertyUrl = `${siteUrl}/properties/${propertyId}`
    const description = propertyDescription || `${bedrooms} bed, ${bathrooms} bath property in ${propertyAddress} - $${price}/month`

    const metadata: Metadata = {
      title: `${propertyName} - Campus Rentals`,
      description,
      openGraph: {
        title: propertyName,
        description,
        url: propertyUrl,
        siteName: 'Campus Rentals',
        images: imageUrl ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: propertyName,
          }
        ] : [],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: propertyName,
        description,
        images: imageUrl ? [imageUrl] : [],
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

