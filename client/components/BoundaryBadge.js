// Small reusable tag list. kind: 'value' | 'boundary' | 'sensory' | 'identity'
export default function BoundaryBadge({ items = [], kind = 'value', highlight = [] }) {
  if (!items.length) return null;
  const cls = { value: '', boundary: 'tag-boundary', sensory: 'tag-sensory', identity: 'tag-identity' }[kind];
  return (
    <div className="tags">
      {items.map((t) => (
        <span key={t} className={`tag ${cls}`} style={highlight.includes(t) ? { fontWeight: 700, outline: '2px solid currentColor' } : undefined}>
          {t}
        </span>
      ))}
    </div>
  );
}
