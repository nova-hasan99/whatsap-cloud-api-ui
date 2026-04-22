export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-md bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-600 shadow-sm">
        {label}
      </span>
    </div>
  );
}
