import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Inbox,
  Activity,
  RefreshCcw,
  Phone,
  UserCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SpinnerCenter } from '@/components/ui/Spinner';
import { NumberFormModal } from '@/components/admin/NumberFormModal';
import { NumberProfileModal } from '@/components/admin/NumberProfileModal';
import { useNumbers } from '@/hooks/useNumbers';
import { supabase, callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { formatPhone, relativeTime } from '@/lib/utils';
import type { WhatsAppNumber } from '@/lib/database.types';

export function NumbersPage() {
  const { numbers, loading, refetch } = useNumbers();
  const toast = useToast();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppNumber | null>(null);
  const [deleting, setDeleting] = useState<WhatsAppNumber | null>(null);
  const [profileNumber, setProfileNumber] = useState<WhatsAppNumber | null>(null);
  const [busy, setBusy] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const tableRows = useMemo(() => numbers, [numbers]);

  async function onConfirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('whatsapp_numbers').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Number removed');
    setDeleting(null);
    refetch();
  }

  async function onTest(n: WhatsAppNumber) {
    setTestingId(n.id);
    try {
      await callFunction('test-connection', { whatsapp_number_id: n.id });
      toast.success(`${n.display_name} is reachable`);
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? 'Test failed');
      refetch();
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp Numbers"
        subtitle="Manage your connected WhatsApp Business numbers"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<RefreshCcw size={14} />} onClick={refetch}>
              Refresh
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Add new number
            </Button>
          </>
        }
      />

      <div className="p-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <SpinnerCenter />
          ) : tableRows.length === 0 ? (
            <EmptyState
              icon={<Phone size={36} />}
              title="No WhatsApp numbers yet"
              message="Connect your first WhatsApp Business number to start receiving messages."
              action={
                <Button icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                  Add new number
                </Button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Display Name</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((n) => (
                  <tr key={n.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{n.display_name}</td>
                    <td className="px-4 py-3 text-gray-700">{formatPhone(n.phone_number)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{relativeTime(n.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Activity size={14} />}
                          loading={testingId === n.id}
                          onClick={() => onTest(n)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Inbox size={14} />}
                          onClick={() => navigate(`/inbox/${n.id}`)}
                        >
                          Inbox
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<UserCircle size={14} />}
                          onClick={() => setProfileNumber(n)}
                        >
                          Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Pencil size={14} />}
                          onClick={() => {
                            setEditing(n);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={14} />}
                          onClick={() => setDeleting(n)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NumberProfileModal
        number={profileNumber}
        onClose={() => setProfileNumber(null)}
      />

      <NumberFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => refetch()}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete WhatsApp number?"
        message={`This will permanently remove "${deleting?.display_name}" and all of its conversations and messages. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
