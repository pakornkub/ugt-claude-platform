import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// next.config.ts runs outside the app runtime, so reading process.env directly
// is allowed here (app code must import from '@/lib/env').
// prod: /leave-request · dev: /leave-request-dev · empty = domain root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  // Required by the org Dockerfile — it copies .next/standalone.
  output: 'standalone',
  basePath,
};

// ต้องส่ง path ให้ชัด เพราะเรา copy ไฟล์ไว้ที่ i18n/ ไม่ใช่ตำแหน่ง default ของ
// next-intl · ไม่ลงทะเบียน = i18n/request.ts ไม่เคยถูกโหลด แล้ว t() ทุกตัวใน kit
// โยน error ตอน render (แอปไม่ขึ้นทั้งแอป ไม่ใช่แค่แย่ลง)
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
