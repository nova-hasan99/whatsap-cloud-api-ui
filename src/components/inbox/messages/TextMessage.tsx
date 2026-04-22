import { linkify } from '@/lib/utils';

export function TextMessage({ body }: { body: string }) {
  const parts = linkify(body || '');
  return (
    <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-gray-900">
      {parts.map((p, i) =>
        p.kind === 'link' ? (
          <a
            key={i}
            href={p.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {p.value}
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  );
}
