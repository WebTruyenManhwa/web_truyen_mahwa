/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'placehold.co',
      'm.media-amazon.com',
      'localhost',
      'picsum.photos',
      '127.0.0.1',
      'cdn-icons-png.flaticon.com',
      '10.50.80.163'
    ],
    unoptimized: true,
  },
  trailingSlash: true,
}

module.exports = nextConfig 