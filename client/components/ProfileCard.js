import Avatar from './Avatar';
import BoundaryBadge from './BoundaryBadge';
import ComfortCard from './ComfortCard';
import Heart from './Heart';

// Profile with the "why you match" explanation — the core demo moment.
export default function ProfileCard({ profile, compatibility, reasons = [], children, className = '' }) {
  return (
    <article className={`card profile-card ${className}`} aria-label={`${profile.name}'s profile`}>
      <div className="profile-cover" />
      <div className="profile-body">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <Avatar profile={profile} size={96} />
          <div style={{ paddingBottom: '0.3rem' }}>
            <h2 style={{ marginBottom: 0 }}>{profile.name}, {profile.age}</h2>
            <div className="muted">{profile.city} · looking for {profile.lookingFor}</div>
          </div>
          <div className="spacer" />
          {typeof compatibility === 'number' && (
            <div className="score-ring" style={{ '--p': compatibility }} aria-label={`${compatibility}% compatible`}>
              <span>{compatibility}%<small>match</small></span>
            </div>
          )}
        </div>

        {reasons.length > 0 && (
          <div className="why">
            <strong><Heart size={16} /> Why you might click</strong>
            <ul>{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        )}

        {profile.bio && <p style={{ margin: 0, fontSize: '1.05rem' }}>&ldquo;{profile.bio}&rdquo;</p>}

        <div>
          <div className="section-label">Values</div>
          <BoundaryBadge items={profile.values} />
        </div>
        {profile.boundaries?.length > 0 && (
          <div>
            <div className="section-label">Boundaries</div>
            <BoundaryBadge items={profile.boundaries} kind="boundary" />
          </div>
        )}
        <ComfortCard profile={profile} />
        {profile.identityTags?.length > 0 && (
          <div>
            <div className="section-label">Identity</div>
            <BoundaryBadge items={profile.identityTags} kind="identity" />
          </div>
        )}
        {profile.identityTagsHidden && <p className="small muted" style={{ margin: 0 }}>Some identity details are shared only after you match.</p>}

        {children}
      </div>
    </article>
  );
}
