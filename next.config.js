/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [process.env.NEXTAUTH_URL || "http://localhost:3000"],
    },
  },
  eslint: {
    dirs: ["app", "components", "lib", "scripts"],
  },
};

module.exports = nextConfig;
