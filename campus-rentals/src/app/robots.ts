import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/investors/', '/test-auth', '/properties/create'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/investors/', '/test-auth', '/properties/create'],
      },
    ],
    sitemap: 'https://campusrentalsllc.com/sitemap.xml',
  };
}
