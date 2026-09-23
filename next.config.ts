import type { NextConfig } from 'next';

// `npm run build:preview` sets STATIC_EXPORT=1 to emit a plain static site
// (no server, no API routes) for hosting the read-only preview.
const isStatic = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStatic
    ? { output: 'export' as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
