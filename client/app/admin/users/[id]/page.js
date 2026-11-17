'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import CommunityBadge from '@/components/CommunityBadge';
import TagSelector from '@/components/TagSelector';
import { BarChart, StatCard } from '@/components/admin/charts';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';
import { fmtDate, fmtDateTime, timeAgo, num, ACTION_LABEL } from '@/lib/format';

function toForm(u) {
  const p = u.profile || {};
  return {
    email: u.email,
    community: u.community || '',
    plan: u.plan,
    status: u.status,
    visibility: u.visibility?.identityTags || 'matches',
    name: p.name || '', age: p.age || '', city: p.city || '', bio: p.bio || '', photoUrl: p.photoUrl || '',
    lookingFor: p.lookingFor || 'dating',
    values: p.values || [], boundaries: p.boundaries || [], identityTags: p.identityTags || [], sensoryPrefs: p.sensoryPrefs || [],
    commStyle: { prefersText: p.commStyle?.prefersText ?? true, replyPace: p.commStyle?.replyPace || 'same day', directness: p.commStyle?.directness || 'medium' },
  };
}

function UserDetail({ id }) {
  const router = useRouter();
  const { user: me, options } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api(`/admin/users/${id}`);
      setData(d);
      setForm(toForm(d.user));
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error && !data) return <div className="error">{error} <Link href="/admin/users">Back to users</Link></div>;
  if (!data || !form || !options) return <p className="muted">Loading…</p>;

  const u = data.user;
  const s = data.stats;
  const isSelf = me.id === u.id;
  const isAdmin = u.role === 'admin';
  const c = options.communities[form.community];
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const run = async (fn, okMsg) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      if (okMsg) setNotice(okMsg);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    const body = { email: form.email, plan: form.plan, status: form.status };
    if (!isAdmin) {
      body.community = form.community;
      body.visibility = { identityTags: form.visibility };
      body.profile = {
        name: form.name, city: form.city, bio: form.bio, lookingFor: form.lookingFor,
        values: form.values, boundaries: form.boundaries, identityTags: form.identityTags, sensoryPrefs: form.sensoryPrefs,
        commStyle: form.commStyle,
      };
      if (form.age) body.profile.age = Number(form.age);
      if (form.photoUrl) body.profile.photoUrl = form.photoUrl;
      if (!form.city) delete body.profile.city;
      if (!form.name) delete body.profile.name;
    } else {
      body.profile = { name: form.name };
    }
    run(() => api(`/admin/users/${id}`, { method: 'PATCH', body }), 'Changes saved');
  };

  const changeCommunity = (e) => {
    const next = e.target.value;
    if (next === form.community) return;
    if (!window.confirm('Changing community clears their values, boundaries, identity tags and swipes, because those belong to the old community. Continue?')) return;
    setForm((f) => ({ ...f, community: next, values: [], boundaries: [], identityTags: [] }));
  };

  return (
    <div className="stack">
      <Link href="/admin/users" className="small">← All users</Link>

      <div className="card row" style={{ alignItems: 'center' }}>
        <Avatar profile={{ ...u.profile, community: u.community }} size={72} />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{u.profile?.name || '(no name yet)'}</h1>
          <div className="muted">{u.email}</div>
          <div className="row" style={{ marginTop: '0.4rem', gap: '0.4rem' }}>
            {isAdmin ? <span className="community admin-badge">Admin</span> : <CommunityBadge community={u.community} />}
            <span className={`pill ${u.status === 'suspended' ? 'pill-warn' : 'pill-ok'}`}>{u.status}</span>
            <span className={`pill ${u.plan === 'premium' ? 'pill-rose' : ''}`}>{u.plan}</span>
            {!isAdmin && !u.profileComplete && <span className="pill">profile incomplete</span>}
          </div>
        </div>
        <div className="spacer" />
        <div className="small muted" style={{ textAlign: 'right' }}>
          Joined {fmtDate(u.createdAt)}<br />Last active {timeAgo(u.lastActiveAt)}
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {notice && <div className="notice" role="status">{notice}</div>}

      {s && (
        <>
          <div className="stat-grid">
            <StatCard label="Likes sent" value={num(s.swipes.likesSent)} sub={`${num(s.swipes.passesSent)} passes`} />
            <StatCard label="Likes received" value={num(s.swipes.likesReceived)} sub={`${num(s.swipes.passesReceived)} passes received`} />
            <StatCard label="Matches" value={num(s.matches)} sub={`${s.likeBackRate}% of their likes matched`} accent />
            <StatCard label="Conversations" value={num(s.conversations)} sub={`${num(s.messagesSent)} sent · ${num(s.messagesReceived)} received`} />
            <StatCard label="Avg compatibility" value={`${s.avgCompatibility}%`} sub="across their matches" />
            <StatCard label="Profile completeness" value={`${s.profileCompleteness}%`} sub="fields filled in" />
            <StatCard label="Blocked by" value={num(s.blockedBy)} sub={`they blocked ${num(s.blockedOthers)}`} />
          </div>

          <div className="card">
            <h3>Likes and passes, last 30 days</h3>
            <BarChart data={s.swipesLast30d.map((d) => ({ date: d.date, value: d.count }))} label="swipes" height={150} />
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <h3>Matches ({s.matchList.length})</h3>
            <p className="muted small" style={{ marginTop: 0 }}>Message counts only. Admins can't read private conversations.</p>
            {s.matchList.length === 0 ? <p className="muted">No matches yet.</p> : (
              <table className="table">
                <thead><tr><th>Matched with</th><th>Compatibility</th><th>Messages</th><th>Matched on</th><th>Last message</th></tr></thead>
                <tbody>
                  {s.matchList.map((m) => (
                    <tr key={m.id}>
                      <td>{m.partner ? <Link href={`/admin/users/${m.partner.id}`}>{m.partner.name}</Link> : 'Deleted user'}</td>
                      <td>{m.compatibility}%</td>
                      <td>{m.messages}</td>
                      <td className="muted">{fmtDate(m.createdAt)}</td>
                      <td className="muted">{timeAgo(m.lastMessageAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', alignItems: 'start' }}>
        <form className="card" onSubmit={save} noValidate>
          <h3>Edit {isAdmin ? 'admin' : 'user'}</h3>
          <div className="row">
            <label className="field" style={{ flex: 2 }}><span>Email</span><input type="email" value={form.email} onChange={set('email')} /></label>
            <label className="field" style={{ flex: 1 }}><span>Name</span><input value={form.name} onChange={set('name')} maxLength={50} /></label>
          </div>
          {!isAdmin && (
            <>
              <div className="row">
                <label className="field" style={{ flex: 1 }}><span>Community</span>
                  <select value={form.community} onChange={changeCommunity}>
                    <option value="sober">Sober</option><option value="eco">Eco &amp; vegan</option><option value="neurodiverse">Neurodiverse</option>
                  </select>
                </label>
                <label className="field" style={{ flex: 1 }}><span>Plan</span>
                  <select value={form.plan} onChange={set('plan')}><option value="free">Free</option><option value="premium">Premium</option></select>
                </label>
                <label className="field" style={{ flex: 1 }}><span>Status</span>
                  <select value={form.status} onChange={set('status')} disabled={isSelf}><option value="active">Active</option><option value="suspended">Suspended</option></select>
                </label>
              </div>
              <div className="row">
                <label className="field" style={{ flex: 1 }}><span>Age</span><input type="number" min={18} max={100} value={form.age} onChange={set('age')} /></label>
                <label className="field" style={{ flex: 2 }}><span>City</span><input value={form.city} onChange={set('city')} /></label>
                <label className="field" style={{ flex: 2 }}><span>Looking for</span>
                  <select value={form.lookingFor} onChange={set('lookingFor')}><option value="friendship">Friendship</option><option value="dating">Dating</option><option value="long-term">Long-term</option></select>
                </label>
              </div>
              <label className="field"><span>Bio</span><textarea value={form.bio} onChange={set('bio')} maxLength={500} /></label>
              <label className="field"><span>Photo URL</span><input type="url" value={form.photoUrl} onChange={set('photoUrl')} /></label>
              {c && (
                <>
                  <TagSelector label="Values" options={c.values} value={form.values} onChange={set('values')} max={8} />
                  <TagSelector label="Boundaries" options={c.boundaries} value={form.boundaries} onChange={set('boundaries')} max={6} />
                  <TagSelector label="Identity tags" options={c.identityTags} value={form.identityTags} onChange={set('identityTags')} max={3} />
                </>
              )}
              <TagSelector label="Sensory preferences" options={options.sensoryPrefs} value={form.sensoryPrefs} onChange={set('sensoryPrefs')} max={7} />
              <div className="row">
                <label className="field" style={{ flex: 1 }}><span>Reply pace</span>
                  <select value={form.commStyle.replyPace} onChange={(e) => setForm((f) => ({ ...f, commStyle: { ...f.commStyle, replyPace: e.target.value } }))}>
                    {options.replyPace.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field" style={{ flex: 1 }}><span>Directness</span>
                  <select value={form.commStyle.directness} onChange={(e) => setForm((f) => ({ ...f, commStyle: { ...f.commStyle, directness: e.target.value } }))}>
                    {options.directness.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field" style={{ flex: 1 }}><span>Identity tags visible to</span>
                  <select value={form.visibility} onChange={set('visibility')}><option value="matches">Matches only</option><option value="everyone">Everyone</option><option value="nobody">Nobody</option></select>
                </label>
              </div>
              <label className="row" style={{ marginBottom: '1rem' }}>
                <input type="checkbox" style={{ width: 20, height: 20 }} checked={form.commStyle.prefersText} onChange={(e) => setForm((f) => ({ ...f, commStyle: { ...f.commStyle, prefersText: e.target.checked } }))} />
                Prefers text over calls
              </label>
            </>
          )}
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>

        <div className="stack">
          <div className="card">
            <h3>Reset password</h3>
            <p className="muted small">Set a new password and share it with the user privately.</p>
            <input type="text" placeholder="New password (8+ chars, a number)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button className="btn btn-ghost" style={{ marginTop: '0.6rem' }} disabled={busy || !newPassword}
              onClick={() => run(() => api(`/admin/users/${id}/password`, { method: 'POST', body: { password: newPassword } }), 'Password updated').then(() => setNewPassword(''))}>
              Update password
            </button>
          </div>

          {!isSelf && (
            <div className="card stack">
              <h3 style={{ margin: 0 }}>Account actions</h3>
              {!isAdmin && (
                <button className="btn btn-ghost" disabled={busy}
                  onClick={() => run(() => api(`/admin/users/${id}`, { method: 'PATCH', body: { status: u.status === 'suspended' ? 'active' : 'suspended' } }), u.status === 'suspended' ? 'Account re-activated' : 'Account suspended')}>
                  {u.status === 'suspended' ? 'Re-activate account' : 'Suspend account'}
                </button>
              )}
              <button className="btn btn-ghost" disabled={busy}
                onClick={() => window.confirm(isAdmin ? 'Remove admin rights from this account?' : 'Give this account full admin access?') &&
                  run(() => api(`/admin/users/${id}/role`, { method: 'POST', body: { role: isAdmin ? 'user' : 'admin' } }), isAdmin ? 'Admin rights removed' : 'User is now an admin')}>
                {isAdmin ? 'Remove admin rights' : 'Make admin'}
              </button>
              <button className="btn btn-danger" disabled={busy}
                onClick={() => window.confirm(`Permanently delete ${u.email}? Their likes, matches and messages are deleted too. This cannot be undone.`) &&
                  run(async () => { await api(`/admin/users/${id}`, { method: 'DELETE' }); router.push('/admin/users'); })}>
                Delete account
              </button>
            </div>
          )}

          <div className="card">
            <h3>Change history</h3>
            {data.history.length === 0 ? <p className="muted small">No admin changes yet.</p> : (
              <ul className="history">
                {data.history.map((h) => (
                  <li key={h._id}>
                    <b>{ACTION_LABEL[h.action] || h.action}</b>
                    <div className="muted small">{h.adminEmail} · {fmtDateTime(h.createdAt)}</div>
                    {h.details && typeof h.details === 'object' && !Array.isArray(h.details) && (
                      <div className="small muted">{Object.keys(h.details).join(', ')}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserPage({ params }) {
  const { id } = use(params);
  return <UserDetail id={id} />;
}
