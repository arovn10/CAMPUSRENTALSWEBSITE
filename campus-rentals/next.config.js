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
    ],
    // Allow serving images from the public directory
    unoptimized: false,
    // Additional settings for better image handling
    domains: ['abodebucket.s3.us-east-2.amazonaws.com', 'd1m1syk7iv23tg.cloudfront.net'],
    minimumCacheTTL: 60,
  },
};