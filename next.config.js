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
  serverExternalPackages: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],
};

module.exports = nextConfig;
