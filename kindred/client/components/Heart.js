// Reusable heart icon (inline SVG, inherits currentColor).
export default function Heart({ size = 20, filled = true, style, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, ...style }}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinejoin="round"
    >
      <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.1 4.5 5.8 4c2.2-.3 4.2.9 5.2 2.6l1 1.6 1-1.6C14 4.9 16 3.7 18.2 4c3.7.5 5.5 4.4 3.8 7.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
