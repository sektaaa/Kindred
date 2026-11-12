/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:5000';

const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* to the Express server so the auth cookie is same-origin.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
