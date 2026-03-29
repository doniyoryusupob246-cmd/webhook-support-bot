/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node-telegram-bot-api', '@upstash/redis'],
};

export default nextConfig;
