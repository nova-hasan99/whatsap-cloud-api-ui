import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cx } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 3000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex min-w-[260px] max-w-md items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-panel animate-slide-up',
              t.kind === 'success' && 'bg-emerald-600 text-white',
              t.kind === 'error' && 'bg-red-600 text-white',
              t.kind === 'info' && 'bg-blue-600 text-white',
            )}
          >
            {t.kind === 'success' && <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
            {t.kind === 'error' && <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            {t.kind === 'info' && <Info size={18} className="shrink-0 mt-0.5" />}
            <div className="flex-1">{t.message}</div>
            <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
