'use client';

// source: ugt-hrms components/ot-auto/run-trend-chart.tsx (ตัดส่วน OT ออก) —
// installed by ugt-nextjs-design-setup เป็น **ตัวอย่างอ้างอิง** ไม่ใช่ component
// กลาง: copy ไปแก้เป็นกราฟของฟีเจอร์ตัวเอง แล้วลบไฟล์นี้ทิ้งได้
//
// ก่อนใช้: npx shadcn@latest add chart  (ได้ components/ui/chart.tsx + recharts)
//
// กฎสีจาก DESIGN.md ที่ตัวอย่างนี้สาธิต:
// - series ทั่วไปที่ไม่มีความหมายเชิงสถานะ → `--chart-1..5` ตามลำดับ ห้ามสีอื่น
// - series ที่ "เป็นสถานะ" จริง (สำเร็จ/ข้าม/ผิดพลาด) → ใช้ `--status-*` ให้ตรง
//   ความหมายเดียวกับ StatusBadge บนตาราง — กราฟกับตารางเล่าเรื่องเดียวกันด้วยสีเดียวกัน
// - ห้าม hardcode hex ทุกกรณี

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export interface TrendPoint {
  /** ป้ายแกน X — วันที่ต้องผ่าน lib/format.ts ก่อนส่งเข้ามา ไม่ format ในนี้ */
  tick: string;
  succeeded: number;
  skipped: number;
  failed: number;
}

// label ใส่ที่ call site (โปรเจค th+en ใส่จาก next-intl) — สีคงที่ตามความหมาย
const CHART_CONFIG = {
  succeeded: { label: 'สำเร็จ', color: 'var(--status-emerald)' },
  skipped: { label: 'ข้าม', color: 'var(--status-amber)' },
  failed: { label: 'ผิดพลาด', color: 'var(--status-red)' },
} satisfies ChartConfig;

export function TrendChartExample({ data }: Readonly<{ data: TrendPoint[] }>) {
  if (data.length === 0) return null;

  return (
    // aspect-auto + ความสูงตายตัว — ให้การ์ดคุมความกว้าง กราฟคุมแค่ความสูง
    <ChartContainer config={CHART_CONFIG} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: -20 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="tick" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {/* stacked: ทั้งสามค่าเป็นส่วนของงานก้อนเดียวกัน — series อิสระใช้แท่งแยก */}
        <Bar dataKey="succeeded" stackId="run" fill="var(--color-succeeded)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="skipped" stackId="run" fill="var(--color-skipped)" />
        <Bar dataKey="failed" stackId="run" fill="var(--color-failed)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
