// Lightweight SVG charts for the admin dashboard (no chart library needed).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

function niceMax(v) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

// Daily bars: data = [{ date: 'YYYY-MM-DD', value: n }]
export function BarChart({ data, color = '#e11d48', height = 180, label = 'value' }) {
  const W = 640, H = height, padL = 34, padB = 26, padT = 10;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const bw = innerW / data.length;
  const every = Math.max(1, Math.ceil(data.length / 7));
  const y = (v) => padT + innerH - (v / max) * innerH;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label}: ${total} in ${data.length} days`}>
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke="#f4d9e0" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#7a5c67">{Math.round(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        return (
          <g key={d.date}>
            <rect x={padL + i * bw + bw * 0.15} y={padT + innerH - h} width={bw * 0.7} height={Math.max(h, d.value ? 2 : 0)} rx="3" fill={color}>
              <title>{`${shortDay(d.date)}: ${d.value} ${label}`}</title>
            </rect>
            {i % every === 0 && (
              <text x={padL + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#7a5c67">{shortDay(d.date)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Horizontal share bars: items = [{ label, value, color? }]
export function Breakdown({ items, total }) {
  const sum = total ?? items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="breakdown">
      {items.map((i) => {
        const share = sum ? Math.round((i.value / sum) * 100) : 0;
        return (
          <div key={i.label} className="breakdown-row">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>{i.label}</span>
              <span className="muted small">{i.value} · {share}%</span>
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${share}%`, background: i.color || 'var(--primary)' }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
