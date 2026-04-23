import { useEffect, useRef, useState } from 'react';
import {
  Smile, Paperclip, Send, FileText, Image, Video,
  FileText as FileIcon, X, CornerUpLeft, Mic, Trash2, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { SUPPORTED_UPLOAD_TYPES } from '@/lib/constants';
import { cx } from '@/lib/utils';
import type { Message } from '@/lib/database.types';
import { MediaPreviewModal } from './MediaPreviewModal';

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

const SLIDE_CANCEL = 100; // px to slide left to cancel

export function ChatFooter({
  conversationId, whatsappNumberId, windowExpiresAt,
  onOpenTemplate, replyTo, onCancelReply,
}: Props) {
  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const cancelledRef = useRef(false);
  const toast = useToast();

  const windowOpen = windowExpiresAt && new Date(windowExpiresAt).getTime() > Date.now();

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 24 * 5)}px`;
  }, [text]);

  useEffect(() => { setText(''); }, [conversationId]);
  useEffect(() => { if (replyTo) taRef.current?.focus(); }, [replyTo]);

  // Clean up recorder on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mrRef.current?.stop();
  }, []);

  // ── Text send ──────────────────────────────────────────────
  async function send() {
    const body = text.trim();
    if (!body) return;
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

  // ── File pick → preview modal ──────────────────────────────
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachOpen(false);
    setPendingFile(file);
  }

  async function onConfirmSend(file: File, caption: string) {
    setPendingFile(null);
    (async () => {
      try {
        const fileToUpload = file.type.startsWith('image/') ? await toJpeg(file) : file;
        const fd = new FormData();
        fd.append('file', fileToUpload);
        fd.append('whatsapp_number_id', whatsappNumberId);
        const res: any = await callFunction('upload-media', fd);
        await callFunction('send-message', {
          conversation_id: conversationId,
          type: inferType(file.type),
          media_id: res.media_id,
          media_url: res.public_url,
          filename: res.filename,
          caption,
        });
      } catch (err: any) {
        toast.error(err.message ?? 'Upload failed');
      }
    })();
  }

  // ── Voice recording ────────────────────────────────────────
  async function startRecording(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = bestAudioMime();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      mr.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelledRef.current && chunksRef.current.length > 0) {
          sendVoice(new Blob(chunksRef.current, { type: mr.mimeType }), mr.mimeType);
        }
      };

      mr.start(200);
      mrRef.current = mr;
      setRecording(true);
      setRecordSecs(0);
      setSlideOffset(0);
      startXRef.current = e.clientX;
      timerRef.current = window.setInterval(() => setRecordSecs((s) => s + 1), 1000);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      toast.error('Microphone access denied');
    }
  }

  function onMicMove(e: React.PointerEvent) {
    if (!recording) return;
    const dx = Math.max(0, startXRef.current - e.clientX);
    setSlideOffset(dx);
    if (dx >= SLIDE_CANCEL) stopRecording(true);
  }

  function stopRecording(cancel = false) {
    if (!mrRef.current) return;
    cancelledRef.current = cancel;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mrRef.current.stop();
    mrRef.current = null;
    setRecording(false);
    setSlideOffset(0);
  }

  async function sendVoice(blob: Blob, mimeType: string) {
    // WhatsApp accepts audio/ogg and audio/mp4 — reject webm early with a clear message
    const isWebM = mimeType.includes('webm');
    if (isWebM) {
      toast.error('Voice messages require Chrome 131+ or Firefox. Please update your browser.');
      return;
    }
    const waType = mimeType.includes('mp4') ? 'audio/mp4' : 'audio/ogg';
    const ext = waType.includes('mp4') ? 'm4a' : 'ogg';
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: waType });
    (async () => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('whatsapp_number_id', whatsappNumberId);
        const res: any = await callFunction('upload-media', fd);
        await callFunction('send-message', {
          conversation_id: conversationId,
          type: 'audio',
          media_id: res.media_id,
          media_url: res.public_url,
        });
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to send voice message');
      }
    })();
  }

  // ── Expired window ─────────────────────────────────────────
  if (!windowOpen) {
    return (
      <div className="flex flex-col gap-2 border-t border-gray-200 bg-wa-panel px-4 py-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Template messages only — the 24-hour window has expired.
        </div>
        <div className="flex justify-end">
          <Button onClick={onOpenTemplate} icon={<FileText size={14} />}>Send template</Button>
        </div>
      </div>
    );
  }

  // ── Recording UI ───────────────────────────────────────────
  if (recording) {
    const progress = Math.min(slideOffset / SLIDE_CANCEL, 1);
    return (
      <div className="flex items-center gap-3 border-t border-gray-200 bg-wa-panel px-4 py-3 select-none">
        {/* Cancel trash icon */}
        <button
          onClick={() => stopRecording(true)}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={20} />
        </button>

        {/* Timer + slide hint */}
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="min-w-[36px] font-mono text-sm text-gray-800">
              {fmtDuration(recordSecs)}
            </span>
          </span>
          <span
            className="flex items-center gap-1 text-xs text-gray-400 transition-opacity duration-100"
            style={{ opacity: 1 - progress * 1.5 }}
          >
            <ChevronLeft size={14} />
            Slide to cancel
          </span>
        </div>

        {/* Mic button (hold) */}
        <button
          onPointerMove={onMicMove}
          onPointerUp={() => stopRecording(false)}
          onPointerCancel={() => stopRecording(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
        >
          <Mic size={20} />
        </button>
      </div>
    );
  }

  // ── Normal footer ──────────────────────────────────────────
  return (
    <>
      {pendingFile && (
        <MediaPreviewModal
          file={pendingFile}
          onSend={onConfirmSend}
          onCancel={() => setPendingFile(null)}
        />
      )}

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

          {/* Emoji */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setEmojiOpen((o) => !o); setAttachOpen(false); }}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-200"
            >
              <Smile size={20} />
            </button>
            {emojiOpen && (
              <div className="absolute bottom-12 left-0 z-20 grid w-64 grid-cols-8 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-panel">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => { setText((t) => t + em); setEmojiOpen(false); taRef.current?.focus(); }}
                    className="rounded p-1 text-lg hover:bg-gray-100"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attach — Photo, Video, Document only (no Audio — use mic) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setAttachOpen((o) => !o); setEmojiOpen(false); }}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-200"
            >
              <Paperclip size={20} />
            </button>
            {attachOpen && (
              <div className="absolute bottom-12 left-0 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-panel">
                {[
                  { label: 'Photo / Video', icon: Image },
                  { label: 'Document', icon: FileIcon },
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

          {/* Text area */}
          <textarea
            ref={taRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Type a message"
            className="flex-1 resize-none rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-wa-primary max-h-[120px]"
          />

          {/* Send OR Mic */}
          {text.trim() ? (
            <button
              type="button"
              onClick={send}
              className="rounded-full bg-wa-primary p-2 text-white hover:bg-wa-teal transition-colors"
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={startRecording}
              onPointerMove={onMicMove}
              onPointerUp={() => stopRecording(false)}
              onPointerCancel={() => stopRecording(true)}
              className="rounded-full bg-wa-primary p-2 text-white hover:bg-wa-teal transition-colors touch-none"
              title="Hold to record voice message"
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function inferType(mime: string): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

function bestAudioMime(): string {
  // Priority: OGG/Opus (Firefox) → MP4/Opus (Chrome 108+) → MP4/AAC (Chrome Win) → webm fallback
  for (const t of [
    'audio/ogg;codecs=opus',
    'audio/mp4;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
  ]) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg', 0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
