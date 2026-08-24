'use client';
// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-mail-setup/components/mail-templates-manager.tsx
// kit-hash: 81a3cd4dd66a
// components/mail-templates-manager.tsx — client editor of /admin/mail-templates:
// รายการ template ซ้าย (จัดกลุ่มตาม workflow) · ฟอร์มแก้ subject/body ขวา ·
// preview เปิดเป็น Sheet (panel ค้างดูคู่ฟอร์ม — บันได dialog DESIGN.md §4)
// render โดย server action ตัวเดียวกับตอนส่งจริง · reset ผ่าน ConfirmActionDialog
// ต้องมี org UI kit จาก ugt-nextjs-design-setup ก่อน
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, Loader2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { cn } from '@/lib/utils';
import {
  previewMailTemplateAction,
  resetMailTemplateAction,
  saveMailTemplateAction,
} from '@/lib/actions/admin-mail-templates';

export interface MailTemplateItem {
  key: string;
  menu: string;
  label: string;
  description: string;
  variables: string[];
  subject: string;
  html: string;
  defaultSubject: string;
  defaultHtml: string;
  isOverridden: boolean;
}

type Draft = { subject: string; html: string; isOverridden: boolean };

export function MailTemplatesManager({ items }: Readonly<{ items: MailTemplateItem[] }>) {
  const t = useTranslations('mail.manager');
  const errT = useTranslations('mail.errors');
  const [selectedKey, setSelectedKey] = useState(items[0]?.key ?? '');
  // draft ต่อ template — เริ่มจากค่า active ที่ server ส่งมา แล้วแก้ใน state นี้
  // (reset รู้ค่า default จาก props จึงไม่ต้อง round-trip)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      items.map((item) => [item.key, { subject: item.subject, html: item.html, isOverridden: item.isOverridden }])
    )
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selected = items.find((item) => item.key === selectedKey);
  const draft = drafts[selectedKey];
  if (!selected || !draft) return null;

  const patchDraft = (patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [selectedKey]: { ...prev[selectedKey], ...patch } }));

  function handleSave() {
    startTransition(async () => {
      const result = await saveMailTemplateAction(selectedKey, {
        subject: draft.subject,
        html: draft.html,
      });
      if (!result.success) {
        toast.error(t('saveFailedTitle'), { description: errT(result.code as Parameters<typeof errT>[0]) });
        return;
      }
      patchDraft({ isOverridden: true });
      toast.success(t('saveSuccessMessage'));
    });
  }

  function handlePreview() {
    startTransition(async () => {
      const result = await previewMailTemplateAction(selectedKey, {
        subject: draft.subject,
        html: draft.html,
      });
      if (!result.success) {
        toast.error(t('previewFailedTitle'), { description: errT(result.code as Parameters<typeof errT>[0]) });
        return;
      }
      setPreview({ subject: result.subject, html: result.html });
      setPreviewOpen(true);
    });
  }

  // จัดกลุ่มตาม workflow (`menu` ของ definition) — ลำดับตามที่ประกาศไว้
  const groups = new Map<string, MailTemplateItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.menu) ?? [];
    bucket.push(item);
    groups.set(item.menu, bucket);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <nav aria-label={t('navLabel')} className="space-y-4">
        {[...groups.entries()].map(([menu, groupItems]) => (
          <div key={menu}>
            <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">{menu}</p>
            <ul className="space-y-0.5">
              {groupItems.map((item) => (
                <li key={item.key}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-2 font-normal',
                      item.key === selectedKey && 'bg-muted font-medium'
                    )}
                    onClick={() => setSelectedKey(item.key)}
                  >
                    <span className="truncate">{item.label}</span>
                    {drafts[item.key]?.isOverridden && (
                      // ตัวระบุ "ถูกแก้จากค่าเริ่มต้น" — Badge outline ตามข้อตกลง §4
                      <Badge variant="outline" className="ml-auto shrink-0">
                        {t('overriddenBadge')}
                      </Badge>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{selected.label}</CardTitle>
          <CardDescription>{selected.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mail-subject">
              {t('subjectLabel')}<span className="text-destructive">*</span>
            </Label>
            <Input
              id="mail-subject"
              value={draft.subject}
              onChange={(e) => patchDraft({ subject: e.target.value })}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mail-html">
              {t('bodyLabel')}<span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mail-html"
              value={draft.html}
              onChange={(e) => patchDraft({ html: e.target.value })}
              disabled={isPending}
              rows={10}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {t('variablesHint')}{' '}
              {selected.variables.map((v) => (
                <code key={v} className="mr-1 rounded bg-muted px-1 py-0.5 font-mono">
                  {`{{${v}}}`}
                </code>
              ))}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!draft.isOverridden || isPending}
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="mr-2 size-4" strokeWidth={2} />
              {t('resetButton')}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={handlePreview}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
              ) : (
                <Eye className="mr-2 size-4" strokeWidth={2} />
              )}
              {t('previewButton')}
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSave}>
              {t('saveButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* preview = Sheet (panel ค้างดูคู่ฟอร์ม) · srcDoc ใน iframe sandbox —
          HTML ของอีเมลต้อง render แยกจากหน้า ไม่ให้ style รั่วเข้าหากัน */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="truncate">{preview?.subject ?? t('previewLabel')}</SheetTitle>
          </SheetHeader>
          <iframe
            title={t('previewLabel')}
            sandbox=""
            srcDoc={preview?.html ?? ''}
            className="min-h-0 flex-1 w-full border-t bg-white"
          />
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('resetDialogTitle', { label: selected.label })}
        description={t('resetDialogDescription')}
        confirmLabel={t('resetButton')}
        successMessage={t('resetDialogSuccessMessage')}
        action={async () => {
          const result = await resetMailTemplateAction(selectedKey);
          if (!result.success) return { error: errT(result.code as Parameters<typeof errT>[0]) };
          patchDraft({
            subject: selected.defaultSubject,
            html: selected.defaultHtml,
            isOverridden: false,
          });
          return { ok: true };
        }}
      />
    </div>
  );
}
