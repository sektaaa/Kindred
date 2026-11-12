const COLORS = { sober: 'var(--sober)', eco: 'var(--eco)', neurodiverse: 'var(--neurodiverse)' };

export default function Avatar({ profile, size = 72 }) {
  if (profile?.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.photoUrl} alt="" className="avatar" style={{ width: size, height: size }} />;
  }
  return (
    <div className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size / 2.6, background: COLORS[profile?.community] || 'var(--primary)' }}>
      {(profile?.name || '?').charAt(0).toUpperCase()}
    </div>
  );
}
