import {
  Phone,
  MessageSquare,
  Send,
  Inbox,
  Activity,
  RefreshCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SpinnerCenter } from '@/components/ui/Spinner';
import { useStats } from '@/hooks/useStats';
import { relativeTime, formatPhone } from '@/lib/utils';

export function DashboardPage() {
  const { stats, loading, refetch } = useStats();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of all connected WhatsApp numbers"
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCcw size={14} />} onClick={refetch}>
            Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {!stats && loading ? (
          <SpinnerCenter />
        ) : !stats ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No data yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Connected Numbers" value={stats.totalNumbers} icon={Phone} tone="emerald" />
              <StatCard label="Conversations Today" value={stats.conversationsToday} icon={MessageSquare} tone="blue" />
              <StatCard label="Messages Sent Today" value={stats.messagesSentToday} icon={Send} tone="violet" />
              <StatCard label="Messages Received Today" value={stats.messagesReceivedToday} icon={Inbox} tone="amber" />
              <StatCard label="Active Conversations" value={stats.activeConversations} icon={Activity} tone="rose" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Section title="Recent Activity">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2">Time</th>
                      <th>Number</th>
                      <th>Event</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentActivity.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400">
                          No recent activity
                        </td>
                      </tr>
                    )}
                    {stats.recentActivity.map((a, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 text-gray-500">{relativeTime(a.time)}</td>
                        <td className="py-2 font-medium text-gray-700">{a.numberLabel}</td>
                        <td className="py-2 text-gray-600">{a.eventType}</td>
                        <td className="py-2 text-gray-500">{a.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section title="Per-number stats">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2">Display Name</th>
                      <th>Phone</th>
                      <th>Conv.</th>
                      <th>Today</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perNumber.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">
                          No numbers connected
                        </td>
                      </tr>
                    )}
                    {stats.perNumber.map((n) => (
                      <tr key={n.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 font-medium text-gray-800">{n.display_name}</td>
                        <td className="py-2 text-gray-600">{formatPhone(n.phone_number)}</td>
                        <td className="py-2 text-gray-700">{n.conversations}</td>
                        <td className="py-2 text-gray-700">{n.messagesToday}</td>
                        <td className="py-2">
                          <StatusBadge status={n.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
