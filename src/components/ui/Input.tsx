import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  rightSlot?: ReactNode;
  leftSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, rightSlot, leftSlot, className, ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label} {rest.required && <span className="text-red-500">*</span>}
        </span>
      )}
      <span
        className={cx(
          'flex items-center rounded-lg border bg-white transition-colors',
          error
            ? 'border-red-400 focus-within:border-red-500'
            : 'border-gray-300 focus-within:border-wa-primary',
        )}
      >
        {leftSlot && <span className="pl-3 text-gray-400">{leftSlot}</span>}
        <input
          ref={ref}
          className={cx(
            'flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400',
            className,
          )}
          {...rest}
        />
        {rightSlot && <span className="pr-2">{rightSlot}</span>}
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
});
