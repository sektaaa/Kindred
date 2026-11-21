'use client';

import { useT } from '@/context/LanguageContext';

// Reusable multi-select made of toggle buttons (accessible via aria-pressed).
export default function TagSelector({ label, hint, options = [], value = [], onChange, max }) {
  const { tag } = useT();
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (!max || value.length < max) onChange([...value, opt]);
  };

  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.25rem' }}>
      <legend style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
        {label} {max && <span className="muted small">({value.length}/{max})</span>}
      </legend>
      {hint && <p className="hint" style={{ marginTop: 0 }}>{hint}</p>}
      <div className="tags">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            className="tag tag-select"
            aria-pressed={value.includes(opt)}
            onClick={() => toggle(opt)}
          >
            {tag(opt)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
