'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';
import { fmtDate, timeAgo } from '@/lib/format';

export default function AdminAdmins() {
  const { user, refresh } = useAuth();
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [me, setMe] = useState({ name: user.profile?.name || '', currentPassword: '', newPassword: '' });

  const load = useCallback(() => api('/admin/admins').then(setAdmins).catch((e) => setError(errorText(e))), []);
  useEffect(() => { load(); }, [load]);

  const submit = async (fn, ok) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      setNotice(ok);
      await load();
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    if (newAdmin.password.length < 8 || !/\d/.test(newAdmin.password)) return setError('Password needs 8+ characters including a number');
    const ok = await submit(() => api('/admin/admins', { method: 'POST', body: newAdmin }), `${newAdmin.email} is now an admin`);
    if (ok) setNewAdmin({ name: '', email: '', password: '' });
  };

  const updateMe = async (e) => {
    e.preventDefault();
    const body = { name: me.name };
    if (me.newPassword) Object.assign(body, { currentPassword: me.currentPassword, newPassword: me.newPassword });
    const ok = await submit(() => api('/admin/me', { method: 'PATCH', body }), 'Your account was updated');
    if (ok) { setMe((m) => ({ ...m, currentPassword: '', newPassword: '' })); refresh(); }
  };

  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 0 }}>Admins</h1>
        <p className="muted" style={{ margin: 0 }}>Every admin has full access: users, events, analytics and other admins.</p>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      {notice && <div className="notice" role="status">{notice}</div>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <form className="card" onSubmit={updateMe}>
          <h3>My admin profile</h3>
          <p className="muted small" style={{ marginTop: 0 }}>{user.email}</p>
          <label className="field"><span>Name</span><input value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} maxLength={50} /></label>
          <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={me.currentPassword} onChange={(e) => setMe({ ...me, currentPassword: e.target.value })} /></label>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={me.newPassword} onChange={(e) => setMe({ ...me, newPassword: e.target.value })} />
            <div className="hint">Leave blank to keep your password. Change the default password after your first login.</div>
          </label>
          <button className="btn" disabled={busy}>Save my profile</button>
        </form>

        <form className="card" onSubmit={createAdmin} noValidate>
          <h3>Create a new admin</h3>
          <p className="muted small" style={{ marginTop: 0 }}>To give an existing member admin access, open them under Users and choose Make admin.</p>
          <label className="field"><span>Name</span><input required value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} maxLength={50} /></label>
          <label className="field"><span>Email</span><input type="email" required value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} /></label>
          <label className="field"><span>Temporary password</span><input type="text" required value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} />
            <div className="hint">8+ characters with a letter and a number. Share it privately.</div>
          </label>
          <button className="btn" disabled={busy || !newAdmin.name || !newAdmin.email || !newAdmin.password}>Create admin</button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Admin</th><th>Added by</th><th>Since</th><th>Last active</th><th></th></tr></thead>
          <tbody>
            {!admins && <tr><td colSpan={5} className="muted">Loading…</td></tr>}
            {admins?.map((a) => (
              <tr key={a.id}>
                <td><b>{a.profile?.name || a.email}</b>{a.isYou && <span className="pill pill-rose" style={{ marginLeft: 8 }}>you</span>}<div className="muted small">{a.email}</div></td>
                <td className="muted">{a.createdBy ? a.createdBy.name || a.createdBy.email : 'System (default admin)'}</td>
                <td className="muted">{fmtDate(a.createdAt)}</td>
                <td className="muted">{timeAgo(a.lastActiveAt)}</td>
                <td>{!a.isYou && <Link href={`/admin/users/${a.id}`} className="small">Manage</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
