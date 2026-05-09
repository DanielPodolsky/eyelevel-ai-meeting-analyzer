export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block animate-spin rounded-full border-2 border-line border-t-accent"
      style={{ width: size, height: size }}
    />
  );
}
