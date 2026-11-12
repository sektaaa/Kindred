// Small set of outline icons used on the landing page and elsewhere.
const PATHS = {
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  chat: 'M4 5h16v11H8l-4 4z M8 9h8 M8 12h5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8z M2 21c0-4 3-6 7-6s7 2 7 6 M17 11a3 3 0 100-6 M22 21c0-3-2-5-5-5.5',
  x: 'M6 6l12 12 M18 6L6 18',
  calendar: 'M4 6h16v14H4z M4 10h16 M9 3v5 M15 3v5',
  leaf: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15 M5 19l7-7',
};

export default function Icon({ name, size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={PATHS[name]} />
    </svg>
  );
}
