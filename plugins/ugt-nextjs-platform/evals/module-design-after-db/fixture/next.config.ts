import type { NextConfig } from 'next';

// next.config.ts runs outside the app runtime, so reading process.env directly
// is allowed here (app code must import from '@/lib/env').
// prod: /leave-request · dev: /leave-request-dev · empty = domain root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  // Required by the org Dockerfile — it copies .next/standalone.
  output: 'standalone',
  basePath,
};

export default nextConfig;
