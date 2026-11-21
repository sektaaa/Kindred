// Small set of outline icons used on the landing page and elsewhere.
const PATHS = {
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  chat: 'M4 5h16v11H8l-4 4z M8 9h8 M8 12h5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8z M2 21c0-4 3-6 7-6s7 2 7 6 M17 11a3 3 0 100-6 M22 21c0-3-2-5-5-5.5',
  x: 'M6 6l12 12 M18 6L6 18',
  calendar: 'M4 6h16v14H4z M4 10h16 M9 3v5 M15 3v5',
  leaf: 'M5 19c0-8 6-14 15-14 0 9-6 15-14 15 M5 19l7-7',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-5-5',
  thumbUp: 'M7 11v9H4v-9z M7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 012 2.3l-1.2 6A2 2 0 0117.3 20H7',
  thumbDown: 'M7 13V4H4v9z M7 13l4 7c1.5 0 2.5-1 2.5-2.5V14h5a2 2 0 002-2.3l-1.2-6A2 2 0 0017.3 4H7',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 1112 0c0 5.5-6 11-6 11z M12 12a2 2 0 100-4 2 2 0 000 4z',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 100-8 4 4 0 000 8z',
  check: 'M5 12l5 5 9-10',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
};

export default function Icon({ name, size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={PATHS[name]} />
    </svg>
  );
}
