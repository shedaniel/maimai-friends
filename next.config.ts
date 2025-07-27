import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  images: {
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maimaidx.jp',
        port: '',
        pathname: '/maimai-mobile/img/Music/**',
      },
      {
        protocol: 'https',
        hostname: 'maimaidx-eng.com',
        port: '',
        pathname: '/maimai-mobile/img/Music/**',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignore server-only file on client builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        './render-image-server': false,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
