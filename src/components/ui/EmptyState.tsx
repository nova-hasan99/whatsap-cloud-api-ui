import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && <div className="text-gray-300">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      {message && <p className="max-w-sm text-sm text-gray-500">{message}</p>}
      {action}
    </div>
  );
}
