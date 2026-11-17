export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} d ago`;
  return fmtDate(d);
}

export const num = (n) => (n ?? 0).toLocaleString('en-IN');

export const COMMUNITY_LABEL = { sober: 'Sober', eco: 'Eco & vegan', neurodiverse: 'Neurodiverse' };

// Turns an audit-log action code into words.
export const ACTION_LABEL = {
  'user.update': 'Edited user',
  'user.reset_password': 'Reset password',
  'user.promote': 'Made admin',
  'admin.demote': 'Removed admin',
  'user.delete': 'Deleted user',
  'admin.delete': 'Deleted admin',
  'admin.create': 'Created admin',
  'admin.update_self': 'Updated own account',
  'event.create': 'Created event',
  'event.update': 'Edited event',
  'event.delete': 'Deleted event',
};
