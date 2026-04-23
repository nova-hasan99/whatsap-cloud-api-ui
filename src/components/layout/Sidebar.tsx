import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Phone,
  MessageSquare,
  FileText,
  ToggleRight,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cx } from '@/lib/utils';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/numbers', label: 'WhatsApp Numbers', icon: Phone },
  { to: '/inbox', label: 'Conversations', icon: MessageSquare },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/setup-guide', label: 'Setup Guide', icon: BookOpen },
];

export function Sidebar() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-wa-primary">
          <MessageSquare size={20} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">WA Business</div>
          <div className="text-[11px] text-gray-500">Management Platform</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-wa-teal'
                  : 'text-gray-600 hover:bg-gray-100',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        <button
          onClick={() => navigate('/inbox')}
          className="mt-2 flex w-full items-center gap-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm font-medium text-wa-teal hover:bg-emerald-50"
        >
          <ToggleRight size={18} />
          Switch to Inbox
        </button>
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div className="px-2 py-2 text-xs text-gray-500">
          Signed in as
          <div className="truncate text-sm font-medium text-gray-800">
            {session?.user.email}
          </div>
        </div>
        <button
          onClick={() => setConfirmLogout(true)}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        message="You'll be signed out of the dashboard. Any unsaved work will be lost."
        confirmLabel="Yes, sign out"
        destructive
        onConfirm={() => { signOut(); setConfirmLogout(false); }}
        onCancel={() => setConfirmLogout(false)}
      />
    </aside>
  );
}
