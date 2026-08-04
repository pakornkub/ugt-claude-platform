'use client';

// source: gov-boi-smart (Base UI native) — installed by ugt-nextjs-design-setup (org UI kit)
// dialog ยืนยัน + เรียก server action + จัดการผลลัพธ์ — ใช้ร่วมทุกหน้ารายการ
// สำเร็จ → toast แล้วปิดตัวเอง · error/throw → toast แล้ว "ค้างไว้" ให้ผู้ใช้อ่านเหตุผล
// (ข้อความอย่าง "ลบไม่ได้ — ยังมีข้อมูลผูกอยู่ ..." ยาวเกินกว่าจะอ่านทันใน toast ที่หายเอง)
// ไม่มี onSuccess — server action เรียก revalidatePath อยู่แล้ว หน้ารีเฟรชเอง
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  successMessage,
  action,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  successMessage: string;
  action: () => Promise<{ ok: true } | { error: string }>;
}>) {
  const [pending, setPending] = useState(false);

  const confirm = async (): Promise<void> => {
    setPending(true);
    try {
      const result = await action();
      if ('error' in result) {
        toast.error(result.error); // ไม่ปิด — ให้ผู้ใช้อ่านเหตุผลใน dialog ต่อได้
        return;
      }
      toast.success(successMessage);
      onOpenChange(false); // parent เคลียร์ target ของตัวเองใน handler นี้
    } catch (error) {
      // throw = ข้อผิดพลาดที่ action ไม่ได้ดักเอง (network / bug) — toast บอกผู้ใช้แค่
      // "เกิดข้อผิดพลาด" ถ้าไม่ log ไว้ด้วยจะไม่เหลือร่องรอยให้ตามเลย
      console.error('ConfirmActionDialog action failed', error);
      toast.error('เกิดข้อผิดพลาด'); // throw ก็ค้าง dialog ไว้เช่นกัน
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => void confirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
