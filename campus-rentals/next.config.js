module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd1m1syk7iv23tg.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'abodebucket.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'campusrentalswebsitebucket.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Enable image optimization for better performance
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // Cache optimized images for 24 hours
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable compression
  compress: true,
  // Optimize production builds
  swcMinify: true,
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
  // `/properties` used to be a client-rendered page that immediately
  // useEffect-redirected to `/` — a JS-only redirect that Google has to render
  // before it discovers the real destination, and a crawl-budget dead end that
  // was still listed in sitemap.xml. A real HTTP redirect resolves before any
  // page renders and passes link equity properly.
  async redirects() {
    return [
      {
        source: '/properties',
        destination: '/',
        permanent: true,
      },
    ];
  },
};