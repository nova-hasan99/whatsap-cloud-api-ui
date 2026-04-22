import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { useTemplates } from '@/hooks/useTemplates';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { MessageTemplate } from '@/lib/database.types';

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  whatsappNumberId: string;
  onSent?: () => void;
}

export function TemplateSelector({
  open,
  onClose,
  conversationId,
  whatsappNumberId,
  onSent,
}: Props) {
  const { templates, loading } = useTemplates(whatsappNumberId);
  const toast = useToast();
  const [selected, setSelected] = useState<MessageTemplate | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setParams({});
    }
  }, [open]);

  const approved = useMemo(
    () => templates.filter((t) => t.status === 'approved'),
    [templates],
  );

  const bodyParams = useMemo(() => extractBodyParams(selected?.components as any), [selected]);

  async function send() {
    if (!selected) return;
    setSending(true);
    try {
      const components: any[] = [];
      if (bodyParams.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParams.map((_, i) => ({
            type: 'text',
            text: params[String(i + 1)] ?? '',
          })),
        });
      }
      await callFunction('send-template', {
        conversation_id: conversationId,
        template_name: selected.template_name,
        language: selected.language,
        components,
      });
      toast.success('Template sent');
      onSent?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send template');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a template message"
      size="lg"
      footer={
        selected ? (
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Back
            </Button>
            <Button onClick={send} loading={sending}>
              Send template
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )
      }
    >
      {!selected ? (
        loading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading templates…</p>
        ) : approved.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No approved templates for this number.
            <br />
            Create one in WhatsApp Manager and click "Refresh from Meta" on the Templates page.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {approved.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-left hover:border-wa-primary hover:bg-emerald-50/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-wa-teal" />
                    <span className="font-medium text-gray-900">{t.template_name}</span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex gap-1.5">
                  <Badge tone="info">{t.category}</Badge>
                  <Badge tone="neutral">{t.language}</Badge>
                </div>
                <p className="line-clamp-3 text-xs text-gray-600">
                  {previewBody(t.components as any)}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Preview</div>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">
              {fillPreview(selected.components as any, params, bodyParams.length)}
            </p>
          </div>
          {bodyParams.map((_, idx) => (
            <Input
              key={idx}
              label={`{{${idx + 1}}}`}
              required
              value={params[String(idx + 1)] || ''}
              onChange={(e) =>
                setParams((p) => ({ ...p, [String(idx + 1)]: e.target.value }))
              }
              placeholder={`Value for {{${idx + 1}}}`}
            />
          ))}
          {bodyParams.length === 0 && (
            <p className="text-xs text-gray-500">This template has no parameters.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function previewBody(components: any): string {
  if (!Array.isArray(components)) return '';
  const body = components.find((c) => c.type === 'BODY');
  return body?.text ?? '';
}

function extractBodyParams(components: any): string[] {
  const text = previewBody(components);
  const re = /{{(\d+)}}/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) found.push(m[1]!);
  return found;
}

function fillPreview(components: any, params: Record<string, string>, count: number) {
  let body = previewBody(components);
  for (let i = 1; i <= count; i++) {
    body = body.replaceAll(`{{${i}}}`, params[String(i)] || `{{${i}}}`);
  }
  return body;
}
