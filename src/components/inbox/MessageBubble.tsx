import { useRef, useState } from 'react';
import { CornerUpLeft } from 'lucide-react';
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

        {/* Hover reply button (desktop) */}
        {onReply && (
          <button
            onClick={() => onReply(message)}
            className={cx(
              'absolute top-1/2 -translate-y-1/2 rounded-full bg-white p-1.5 shadow-sm opacity-0 transition-opacity group-hover:opacity-100',
              outbound ? 'left-2' : 'right-2',
            )}
            title="Reply"
          >
            <CornerUpLeft size={14} className="text-gray-500" />
          </button>
        )}

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
          {content.error && (
            <span className="text-xs text-red-600">{content.error}</span>
          )}
        </div>
      );
    default:
      return <p className="text-xs text-gray-500">Unsupported message type</p>;
  }
}
