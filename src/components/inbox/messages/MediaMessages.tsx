import { Play, FileText, Download, Mic } from 'lucide-react';
import { formatBytes, truncate } from '@/lib/utils';

interface MediaProps {
  url?: string;
  caption?: string;
  onOpenLightbox?: (url: string) => void;
}

export function ImageMessage({ url, caption, onOpenLightbox }: MediaProps) {
  if (!url) return <PlaceholderMedia label="Image (downloading…)" />;
  return (
    <div>
      <button
        type="button"
        className="block overflow-hidden rounded-md"
        onClick={() => onOpenLightbox?.(url)}
      >
        <img
          src={url}
          alt={caption || 'image'}
          className="max-h-[300px] max-w-[300px] rounded-md object-cover"
        />
      </button>
      {caption && <p className="mt-1 text-[14px] leading-snug">{caption}</p>}
    </div>
  );
}

export function VideoMessage({ url, caption }: MediaProps) {
  if (!url) return <PlaceholderMedia label="Video (downloading…)" icon={<Play size={20} />} />;
  return (
    <div>
      <video
        src={url}
        controls
        className="max-h-[320px] max-w-[320px] rounded-md bg-black"
        preload="metadata"
      />
      {caption && <p className="mt-1 text-[14px] leading-snug">{caption}</p>}
    </div>
  );
}

interface DocProps extends MediaProps {
  filename?: string;
  size?: number;
  mime?: string;
}

export function DocumentMessage({ url, filename, size, caption }: DocProps) {
  return (
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={filename}
        className="flex items-center gap-3 rounded-md bg-black/5 px-3 py-2 hover:bg-black/10"
      >
        <FileText size={28} className="text-wa-teal" />
        <div className="flex-1 overflow-hidden">
          <div className="truncate text-sm font-medium text-gray-900">
            {truncate(filename || 'document', 36)}
          </div>
          {size ? (
            <div className="text-[11px] text-gray-500">{formatBytes(size)}</div>
          ) : null}
        </div>
        <Download size={16} className="text-gray-500" />
      </a>
      {caption && <p className="mt-1 text-[14px] leading-snug">{caption}</p>}
    </div>
  );
}

export function AudioMessage({ url }: MediaProps) {
  if (!url) return <PlaceholderMedia label="Audio (downloading…)" icon={<Mic size={18} />} />;
  return (
    <div className="min-w-[220px]">
      <audio controls src={url} className="w-full" preload="metadata" />
    </div>
  );
}

function PlaceholderMedia({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-black/5 px-3 py-2 text-xs text-gray-500">
      {icon}
      {label}
    </div>
  );
}
