/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['media.api-sports.io', 'crests.football-data.org', 'media.sportmonks.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
