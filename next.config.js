/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.same-assets.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
