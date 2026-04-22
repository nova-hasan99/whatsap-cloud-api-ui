import { useEffect } from 'react';
import { X } from 'lucide-react';

export function MediaLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-6 animate-fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <img src={url} alt="" className="max-h-full max-w-full rounded-md object-contain" />
    </div>
  );
}
