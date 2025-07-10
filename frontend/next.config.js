/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
  },
};

module.exports = nextConfig;
