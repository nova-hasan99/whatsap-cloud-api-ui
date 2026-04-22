import { cx, initial, stringColor } from '@/lib/utils';

interface Props {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 48, className }: Props) {
  const letter = initial(name || '?');
  const bg = stringColor(name || letter);

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        width={size}
        height={size}
        className={cx('rounded-full object-cover shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-medium text-white',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  );
}
