import { useRef, useState } from 'react';
import { CornerUpLeft, AlertTriangle } from 'lucide-react';
import { cx, chatTime } from '@/lib/utils';
import type { Message } from '@/lib/database.types';
import { MessageStatusIcon } from './MessageStatus';
import { TextMessage } from './messages/TextMessage';
import {
  AudioMessage,
  DocumentMessage,
  ImageMessage,
  VideoMessage,
} from './messages/MediaMessages';
import { MediaLightbox } from './MediaLightbox';

interface Props {
  message: Message;
  prevSameSender: boolean;
  allMessages: Message[];
  onReply?: (msg: Message) => void;
}

const SWIPE_THRESHOLD = 60;

export function MessageBubble({ message, prevSameSender, allMessages, onReply }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [showReplyHint, setShowReplyHint] = useState(false);
  const startXRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const outbound = message.direction === 'outbound';
  const content = (message.content || {}) as Record<string, any>;
  const showTail = !prevSameSender;

  // Look up the quoted message if this message is a reply
  const quotedMsg = content.context_wamid
    ? allMessages.find((m) => m.wamid === content.context_wamid)
    : null;

  // ── Swipe handlers (pointer events work for both touch + mouse) ──
  function onPointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    triggeredRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (dx < 0) return; // only swipe right
    const clamped = Math.min(dx, SWIPE_THRESHOLD + 20);
    setTranslateX(clamped);
    setShowReplyHint(clamped > SWIPE_THRESHOLD * 0.5);
    if (clamped >= SWIPE_THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true;
    }
  }

  function onPointerUp() {
    if (triggeredRef.current) onReply?.(message);
    setTranslateX(0);
    setShowReplyHint(false);
    startXRef.current = null;
    triggeredRef.current = false;
  }

  return (
    <>
      <div
        className={cx(
          'group relative flex w-full items-center px-3',
          outbound ? 'justify-end' : 'justify-start',
          showTail ? 'mt-2' : 'mt-1',
        )}
      >
        {/* Swipe reply icon — appears behind the bubble */}
        <div
          className={cx(
            'absolute transition-opacity duration-100',
            outbound ? 'left-3' : 'right-3',
            showReplyHint ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
            <CornerUpLeft size={15} />
          </div>
        </div>

        {/* Bubble */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: `translateX(${outbound ? -translateX : translateX}px)`,
            transition: translateX === 0 ? 'transform 0.2s ease' : 'none',
          }}
          className={cx(
            'relative max-w-[78%] cursor-grab select-none rounded-[7px] px-2.5 py-1.5 shadow-bubble',
            outbound ? 'bg-wa-outbound' : 'bg-white',
            showTail && (outbound ? 'bubble-tail-out' : 'bubble-tail-in'),
          )}
        >
          {/* Quoted message preview */}
          {quotedMsg && (
            <div
              className={cx(
                'mb-1.5 rounded-md border-l-4 px-2 py-1 text-xs',
                outbound
                  ? 'border-white/60 bg-black/10'
                  : 'border-wa-teal bg-gray-100',
              )}
            >
              <p className={cx('font-medium', outbound ? 'text-white/80' : 'text-wa-teal')}>
                {quotedMsg.direction === 'inbound' ? 'Customer' : 'You'}
              </p>
              <p className={cx('truncate', outbound ? 'text-white/70' : 'text-gray-500')}>
                {quotedMsg.type === 'text'
                  ? (quotedMsg.content as any)?.body
                  : `${quotedMsg.type} message`}
              </p>
            </div>
          )}

          {renderContent(message, content, (u) => setLightbox(u))}

          {/* Failed message error banner */}
          {message.status === 'failed' && content.error && (() => {
            const err = parseMessageError(content.error);
            if (!err) return null;
            return (
              <div className="mt-1.5 overflow-hidden rounded-md border border-red-200 bg-white text-xs shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-red-100 bg-red-50 px-2 py-1">
                  <AlertTriangle size={11} className="shrink-0 text-red-500" />
                  <span className="truncate font-medium text-red-700">
                    {err.rawTitle || 'Message not delivered'}
                  </span>
                  {err.code && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-red-400">
                      #{err.code}
                    </span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="leading-snug text-gray-600">{err.rawDetail || err.friendly}</p>
                </div>
              </div>
            );
          })()}

          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[11px] text-gray-500">{chatTime(message.timestamp)}</span>
            {outbound && <MessageStatusIcon status={message.status} />}
          </div>
        </div>
      </div>

      {lightbox && <MediaLightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

function renderContent(
  message: Message,
  content: Record<string, any>,
  onOpenLightbox: (url: string) => void,
) {
  switch (message.type) {
    case 'text':
      if (content.external && !content.body) {
        return (
          <p className="text-[13px] italic text-gray-400">
            📤 Sent via external tool
          </p>
        );
      }
      return <TextMessage body={content.body || ''} />;
    case 'image':
      return (
        <ImageMessage
          url={content.public_url || content.link || content.url}
          caption={content.caption}
          onOpenLightbox={onOpenLightbox}
        />
      );
    case 'video':
      return (
        <VideoMessage
          url={content.public_url || content.link || content.url}
          caption={content.caption}
        />
      );
    case 'audio':
      return <AudioMessage url={content.public_url || content.link || content.url} />;
    case 'document':
      return (
        <DocumentMessage
          url={content.public_url || content.link || content.url}
          filename={content.filename}
          size={content.size}
          caption={content.caption}
          mime={content.mime_type}
        />
      );
    case 'template':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Template
          </span>
          <span className="text-sm font-medium text-gray-900">
            {content.template_name}
          </span>
        </div>
      );
    default:
      return <p className="text-xs text-gray-500">Unsupported message type</p>;
  }
}

// ── Error helpers ──────────────────────────────────────────────

const META_ERROR_FRIENDLY: Record<number, string> = {
  131042: 'Payment method issue — visit Meta Business Manager to fix your billing.',
  131049: "Not delivered — the recipient hasn't engaged with your business. Ask them to message you first.",
  131047: '24-hour messaging window expired. Send a template message instead.',
  131026: "Undeliverable — the recipient's number may be invalid or unreachable.",
  131000: "Something went wrong on WhatsApp's servers. Please try again.",
  131008: 'Missing required message parameters.',
  131021: "This number isn't in your approved test recipients list.",
  131051: 'Unsupported message type for this recipient.',
  130472: 'WhatsApp is running an A/B test on this message — delivery not guaranteed.',
  368:    'Account temporarily blocked for policy violations.',
  100:    'Invalid message content or parameter.',
};

function parseMessageError(
  err: unknown,
): { friendly: string; code?: number; rawTitle?: string; rawDetail?: string } | null {
  if (!err) return null;

  if (typeof err === 'object' && err !== null) {
    const e = err as any;
    const code = Number(e.code) || undefined;
    const rawTitle: string = e.title || e.message || '';
    const rawDetail: string = e.error_data?.details || e.message || '';
    const friendly = (code && META_ERROR_FRIENDLY[code]) || rawDetail || 'Message failed to send.';
    return { friendly, code, rawTitle, rawDetail };
  }

  if (typeof err === 'string') {
    try {
      return parseMessageError(JSON.parse(err));
    } catch {}

    if (err.includes('131049') || /healthy ecosystem/i.test(err))
      return { friendly: META_ERROR_FRIENDLY[131049], code: 131049, rawTitle: 'Ecosystem engagement block', rawDetail: err };
    if (err.includes('131042') || /payment/i.test(err))
      return { friendly: META_ERROR_FRIENDLY[131042], code: 131042, rawTitle: 'Business eligibility payment issue', rawDetail: err };
    if (err.includes('131047') || /window/i.test(err))
      return { friendly: META_ERROR_FRIENDLY[131047], code: 131047, rawTitle: 'Outside messaging window', rawDetail: err };

    return { friendly: err, rawDetail: err };
  }

  return null;
}
