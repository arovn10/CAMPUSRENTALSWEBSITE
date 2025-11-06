import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campusrentalsllc.com'
  
  // Fetch all properties from database
  let properties: Array<{ propertyId: number | null }> = []
  try {
    const allProperties = await prisma.property.findMany({
      select: {
        propertyId: true
      }
    })
    // Filter out properties with null propertyId
    properties = allProperties.filter(p => p.propertyId !== null)
  } catch (error) {
    console.error('Error fetching properties for sitemap:', error)
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tulane-housing`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/fau-housing`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // Dynamic property pages
  const propertyPages: MetadataRoute.Sitemap = properties
    .filter(p => p.propertyId !== null)
    .map((property) => ({
      url: `${baseUrl}/properties/${property.propertyId}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

  return [...staticPages, ...propertyPages]
}

