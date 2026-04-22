import { useEffect, useRef, useState } from 'react';
import { Smile, Paperclip, Send, FileText, Image, Video, Mic, FileText as FileIcon, X, CornerUpLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { SUPPORTED_UPLOAD_TYPES } from '@/lib/constants';
import { cx } from '@/lib/utils';
import type { Message } from '@/lib/database.types';

interface Props {
  conversationId: string;
  whatsappNumberId: string;
  windowExpiresAt: string | null;
  onOpenTemplate: () => void;
  replyTo: Message | null;
  onCancelReply: () => void;
}

const EMOJIS = [
  '😀','😂','😍','😊','😎','🤔','😢','😡',
  '👍','👎','🙏','👏','🙌','💪','🔥','✨',
  '❤️','💔','💯','🎉','🎁','✅','⚠️','📢',
];

export function ChatFooter({
  conversationId,
  whatsappNumberId,
  windowExpiresAt,
  onOpenTemplate,
  replyTo,
  onCancelReply,
}: Props) {
  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const windowOpen = windowExpiresAt && new Date(windowExpiresAt).getTime() > Date.now();

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 24 * 5)}px`;
  }, [text]);

  // Reset on conversation change
  useEffect(() => {
    setText('');
  }, [conversationId]);

  // Focus input when replyTo is set
  useEffect(() => {
    if (replyTo) taRef.current?.focus();
  }, [replyTo]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    // Clear immediately — don't wait for API
    setText('');
    const currentReply = replyTo;
    onCancelReply();
    taRef.current?.focus();
    try {
      await callFunction('send-message', {
        conversation_id: conversationId,
        type: 'text',
        text: body,
        ...(currentReply?.wamid ? { reply_to_wamid: currentReply.wamid } : {}),
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send');
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachOpen(false);
    // Fire-and-forget — don't block the input
    (async () => {
      try {
        const fileToUpload = file.type.startsWith('image/') ? await toJpeg(file) : file;
        const fd = new FormData();
        fd.append('file', fileToUpload);
        fd.append('whatsapp_number_id', whatsappNumberId);
        const res: any = await callFunction('upload-media', fd);
        const type = inferType(file.type);
        await callFunction('send-message', {
          conversation_id: conversationId,
          type,
          media_id: res.media_id,
          media_url: res.public_url,
          filename: res.filename,
          caption: '',
        });
      } catch (err: any) {
        toast.error(err.message ?? 'Upload failed');
      }
    })();
  }

  if (!windowOpen) {
    return (
      <div className="flex flex-col gap-2 border-t border-gray-200 bg-wa-panel px-4 py-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Template messages only — the 24-hour window has expired.
        </div>
        <div className="flex justify-end">
          <Button onClick={onOpenTemplate} icon={<FileText size={14} />}>
            Send template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 bg-wa-panel">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white/70 px-3 py-2">
          <CornerUpLeft size={14} className="shrink-0 text-wa-teal" />
          <div className="min-w-0 flex-1 border-l-2 border-wa-teal pl-2">
            <p className="truncate text-xs font-medium text-wa-teal">
              {replyTo.direction === 'inbound' ? 'Replying to customer' : 'Replying to yourself'}
            </p>
            <p className="truncate text-xs text-gray-500">
              {replyTo.type === 'text'
                ? (replyTo.content as any)?.body
                : `${replyTo.type} message`}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2 px-3 py-2">
        <input
          ref={fileRef}
          type="file"
          accept={SUPPORTED_UPLOAD_TYPES}
          onChange={onPickFile}
          className="hidden"
        />

        {/* Emoji picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setEmojiOpen((o) => !o); setAttachOpen(false); }}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-200"
            aria-label="Emoji picker"
          >
            <Smile size={20} />
          </button>
          {emojiOpen && (
            <div className="absolute bottom-12 left-0 z-20 grid w-64 grid-cols-8 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-panel">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    setText((t) => t + em);
                    setEmojiOpen(false);
                    taRef.current?.focus();
                  }}
                  className="rounded p-1 text-lg hover:bg-gray-100"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attachment picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setAttachOpen((o) => !o); setEmojiOpen(false); }}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-200"
            aria-label="Attach"
          >
            <Paperclip size={20} />
          </button>
          {attachOpen && (
            <div className="absolute bottom-12 left-0 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-panel">
              {[
                { label: 'Photo', icon: Image },
                { label: 'Video', icon: Video },
                { label: 'Document', icon: FileIcon },
                { label: 'Audio', icon: Mic },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => { setAttachOpen(false); fileRef.current?.click(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Icon size={16} className="text-wa-teal" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={taRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message"
          className="flex-1 resize-none rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-wa-primary max-h-[120px]"
        />

        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          className={cx(
            'rounded-full p-2 transition-colors',
            text.trim()
              ? 'bg-wa-primary text-white hover:bg-wa-teal'
              : 'cursor-not-allowed bg-gray-200 text-gray-400',
          )}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function inferType(mime: string): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

function toJpeg(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
