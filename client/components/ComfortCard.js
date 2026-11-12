import BoundaryBadge from './BoundaryBadge';

const PACE = { fast: 'Replies quickly', 'same day': 'Replies within the day', slow: 'Replies slowly — no pressure' };
const DIRECT = { low: 'gentle, indirect', medium: 'balanced', high: 'direct — say what you mean' };

// "How to talk to me" — communication accommodations made visible up front.
export default function ComfortCard({ profile, title = 'How to talk to me' }) {
  const cs = profile.commStyle || {};
  return (
    <div className="comfort">
      <div className="section-label">{title}</div>
      <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.2rem' }}>
        <li>{cs.prefersText ? 'Prefers text over calls' : 'Happy with calls or voice notes'}</li>
        <li>{PACE[cs.replyPace] || PACE['same day']}</li>
        <li>Communication style: {DIRECT[cs.directness] || 'balanced'}</li>
      </ul>
      <BoundaryBadge items={profile.sensoryPrefs} kind="sensory" />
    </div>
  );
}
