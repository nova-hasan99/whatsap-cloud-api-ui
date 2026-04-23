import { useEffect, useRef, useState } from 'react';
import { X, Send, FileText, Mic, Film } from 'lucide-react';
import { cx, formatBytes } from '@/lib/utils';

interface Props {
  file: File;
  onSend: (file: File, caption: string) => void;
  onCancel: () => void;
}

export function MediaPreviewModal({ file, onSend, onCancel }: Props) {
  const [caption, setCaption] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const hasCaption = isImage || isVideo;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Focus caption input when modal opens (for images/videos)
  useEffect(() => {
    if (hasCaption) setTimeout(() => inputRef.current?.focus(), 100);
  }, [hasCaption]);

  function handleSend() {
    onSend(file, caption.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-[#1f2c34] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-full p-1.5 text-gray-400 hover:bg-white/10"
          >
            <X size={20} />
          </button>
          <span className="text-sm font-medium text-gray-200 truncate max-w-[260px]">
            {file.name}
          </span>
          <div className="w-8" />
        </div>

        {/* Preview area */}
        <div className="flex items-center justify-center bg-black/40 px-4 py-4 min-h-[260px]">
          {isImage && objectUrl && (
            <img
              src={objectUrl}
              alt={file.name}
              className="max-h-[360px] max-w-full rounded-lg object-contain"
            />
          )}

          {isVideo && objectUrl && (
            <video
              src={objectUrl}
              controls
              className="max-h-[360px] max-w-full rounded-lg"
            />
          )}

          {isAudio && objectUrl && (
            <div className="flex flex-col items-center gap-3 w-full px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wa-teal/20">
                <Mic size={28} className="text-wa-teal" />
              </div>
              <audio controls src={objectUrl} className="w-full" />
              <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
            </div>
          )}

          {!isImage && !isVideo && !isAudio && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-wa-teal/20">
                {file.type.startsWith('video/') ? (
                  <Film size={36} className="text-wa-teal" />
                ) : (
                  <FileText size={36} className="text-wa-teal" />
                )}
              </div>
              <p className="max-w-[260px] break-all text-center text-sm font-medium text-gray-200">
                {file.name}
              </p>
              <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
            </div>
          )}
        </div>

        {/* Caption + Send */}
        <div className={cx(
          'flex items-center gap-2 px-3 py-3',
          hasCaption ? 'bg-[#1f2c34]' : 'justify-center bg-[#1f2c34]',
        )}>
          {hasCaption ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a caption…"
                maxLength={1024}
                className="flex-1 rounded-full bg-[#2a3942] px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-wa-teal"
              />
              <button
                onClick={handleSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wa-teal text-white hover:bg-wa-primary transition-colors"
              >
                <Send size={16} />
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="rounded-full border border-gray-500 px-6 py-2 text-sm text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="flex items-center gap-2 rounded-full bg-wa-teal px-6 py-2 text-sm font-medium text-white hover:bg-wa-primary transition-colors"
              >
                <Send size={15} />
                Send
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
