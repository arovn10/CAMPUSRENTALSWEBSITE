import { MetadataRoute } from 'next';
import { fetchProperties } from '@/utils/api';

export const revalidate = 3600; // refresh property URLs hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://campusrentalsllc.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/tulane-housing`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/fau-housing`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/properties`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/plaza`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Every live listing gets its own indexed URL (fetchProperties returns [] on failure,
  // so a backend outage degrades to the static pages instead of breaking the sitemap).
  let propertyPages: MetadataRoute.Sitemap = [];
  try {
    const properties = await fetchProperties();
    propertyPages = properties.map((p) => ({
      url: `${baseUrl}/properties/${p.property_id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // keep static pages only
  }

  return [...staticPages, ...propertyPages];
}
