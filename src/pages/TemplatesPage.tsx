import { useMemo, useState } from 'react';
import { RefreshCcw, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SpinnerCenter } from '@/components/ui/Spinner';
import { useNumbers } from '@/hooks/useNumbers';
import { useTemplates } from '@/hooks/useTemplates';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { TEMPLATE_CATEGORIES } from '@/lib/constants';
import type { TemplateCategory } from '@/lib/database.types';

export function TemplatesPage() {
  const { numbers } = useNumbers();
  const [numberId, setNumberId] = useState<string | 'all' | null>(null);
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const { templates, loading, refetch } = useTemplates(
    numberId && numberId !== 'all' ? numberId : null,
  );
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () => (category === 'all' ? templates : templates.filter((t) => t.category === category)),
    [templates, category],
  );

  const numberOptions: DropdownOption<string>[] = [
    { value: 'all', label: 'All numbers' },
    ...numbers.map((n) => ({ value: n.id, label: n.display_name, description: n.phone_number })),
  ];

  const categoryOptions: DropdownOption<string>[] = [
    { value: 'all', label: 'All categories' },
    ...TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: c[0]!.toUpperCase() + c.slice(1) })),
  ];

  async function refreshFromMeta() {
    if (!numberId || numberId === 'all') {
      toast.info('Select a specific number to refresh from Meta');
      return;
    }
    setRefreshing(true);
    try {
      await callFunction('fetch-templates', { whatsapp_number_id: numberId });
      toast.success('Templates synced');
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? 'Sync failed');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Pre-approved messages you can send outside the 24-hour window"
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            icon={<RefreshCcw size={14} />}
            onClick={refreshFromMeta}
          >
            Refresh from Meta
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            value={numberId}
            options={numberOptions}
            onChange={(v) => setNumberId(v as any)}
            placeholder="Filter by number"
            className="w-64"
          />
          <Dropdown
            value={category}
            options={categoryOptions}
            onChange={(v) => setCategory(v as any)}
            className="w-56"
          />
        </div>

        {loading ? (
          <SpinnerCenter />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={36} />}
            title="No templates"
            message="Sync from Meta or create templates in the WhatsApp Manager."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{t.template_name}</h3>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mb-3 flex items-center gap-2 text-xs">
                  <Badge tone="info">{t.category}</Badge>
                  <Badge tone="neutral">{t.language}</Badge>
                </div>
                <pre className="line-clamp-6 max-h-40 overflow-hidden whitespace-pre-wrap rounded bg-gray-50 p-3 text-[12px] text-gray-700">
                  {previewComponents(t.components as any)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function previewComponents(components: any): string {
  if (!Array.isArray(components)) return JSON.stringify(components, null, 2);
  const parts: string[] = [];
  for (const c of components) {
    if (c.type === 'HEADER' && c.text) parts.push(`*${c.text}*`);
    if (c.type === 'BODY' && c.text) parts.push(c.text);
    if (c.type === 'FOOTER' && c.text) parts.push(`— ${c.text}`);
    if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) {
      parts.push(c.buttons.map((b: any) => `[${b.text}]`).join(' '));
    }
  }
  return parts.join('\n\n');
}
