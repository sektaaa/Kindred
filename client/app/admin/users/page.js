'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import CommunityBadge from '@/components/CommunityBadge';
import { api, errorText } from '@/lib/api';
import { fmtDate, timeAgo, num } from '@/lib/format';

const EMPTY = { search: '', community: '', plan: '', status: '', profile: '', sort: 'newest' };

export default function AdminUsers() {
  const router = useRouter();
  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    try {
      setData(await api(`/admin/users?${qs}`));
    } catch (e) {
      setError(errorText(e));
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  // Debounced search box.
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setFilters((f) => ({ ...f, search })); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const set = (k) => (e) => { setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value })); };

  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 0 }}>Users</h1>
        <p className="muted" style={{ margin: 0 }}>Search, filter and open any member to see their activity or make changes.</p>
      </div>

      <div className="card filters">
        <input placeholder="Search name, email or city" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 2, minWidth: 220 }} />
        <select value={filters.community} onChange={set('community')} aria-label="Community">
          <option value="">All communities</option>
          <option value="sober">Sober</option>
          <option value="eco">Eco &amp; vegan</option>
          <option value="neurodiverse">Neurodiverse</option>
        </select>
        <select value={filters.plan} onChange={set('plan')} aria-label="Plan">
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <select value={filters.status} onChange={set('status')} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={filters.profile} onChange={set('profile')} aria-label="Profile">
          <option value="">Any profile</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <select value={filters.sort} onChange={set('sort')} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="active">Recently active</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}
      {!data ? <p className="muted">Loading…</p> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table clickable">
            <thead>
              <tr><th>User</th><th>Community</th><th>Plan</th><th>Status</th><th>Likes</th><th>Matches</th><th>Messages</th><th>Joined</th><th>Last active</th></tr>
            </thead>
            <tbody>
              {data.users.length === 0 && <tr><td colSpan={9} className="muted center">No users match these filters.</td></tr>}
              {data.users.map((u) => (
                <tr key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/users/${u.id}`)}>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap', gap: '0.6rem' }}>
                      <Avatar profile={{ ...u.profile, community: u.community }} size={36} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{u.profile?.name || '(no name yet)'}</div>
                        <div className="muted small">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><CommunityBadge community={u.community} /></td>
                  <td><span className={`pill ${u.plan === 'premium' ? 'pill-rose' : ''}`}>{u.plan}</span></td>
                  <td><span className={`pill ${u.status === 'suspended' ? 'pill-warn' : 'pill-ok'}`}>{u.status}</span>{!u.profileComplete && <div className="muted small">profile incomplete</div>}</td>
                  <td>{num(u.counts.likes)}</td>
                  <td>{num(u.counts.matches)}</td>
                  <td>{num(u.counts.messages)}</td>
                  <td className="muted">{fmtDate(u.createdAt)}</td>
                  <td className="muted">{timeAgo(u.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted small">{num(data.total)} users · page {data.page} of {data.pages}</span>
          <div className="row">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
