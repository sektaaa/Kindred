'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errorText } from '@/lib/api';
import { num, timeAgo, COMMUNITY_LABEL, ACTION_LABEL } from '@/lib/format';
import { BarChart, Breakdown, StatCard } from '@/components/admin/charts';

const COMMUNITY_COLOR = { sober: 'var(--sober)', eco: 'var(--eco)', neurodiverse: 'var(--neurodiverse)' };
const RANGES = [7, 30, 90];

export default function AdminDashboard() {
  const [o, setO] = useState(null);
  const [series, setSeries] = useState(null);
  const [days, setDays] = useState(30);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats/overview').then(setO).catch((e) => setError(errorText(e)));
    api('/admin/logs?limit=8').then(setLogs).catch(() => {});
  }, []);

  useEffect(() => {
    setSeries(null);
    api(`/admin/stats/timeseries?days=${days}`).then(setSeries).catch((e) => setError(errorText(e)));
  }, [days]);

  if (error) return <div className="error">{error}</div>;
  if (!o) return <p className="muted">Loading analytics…</p>;

  const sum = (k) => (series || []).reduce((s, d) => s + d[k], 0);
  const pick = (k) => (series || []).map((d) => ({ date: d.date, value: d[k] }));

  return (
    <div className="stack">
      <div className="row">
        <div>
          <h1 style={{ marginBottom: 0 }}>Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>Platform health at a glance. Admin accounts are not counted as users.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total users" value={num(o.users.total)} sub={`+${num(o.users.new7d)} this week · +${num(o.users.newToday)} today`} accent />
        <StatCard label="Active (7 days)" value={num(o.users.active7d)} sub={`${num(o.users.active1d)} today · ${num(o.users.active30d)} in 30 days`} />
        <StatCard label="Profiles complete" value={`${o.rates.profileCompletion}%`} sub={`${num(o.users.profileComplete)} of ${num(o.users.total)}`} />
        <StatCard label="Premium" value={num(o.users.premium)} sub={`${o.rates.premiumConversion}% conversion`} />
        <StatCard label="Matches" value={num(o.engagement.matches)} sub={`${o.rates.mutualMatchRate}% of likes end in a match`} />
        <StatCard label="Conversations" value={num(o.engagement.conversations)} sub={`${o.rates.conversationRate}% of matches · ${o.rates.avgMessagesPerMatch} msgs/match`} />
        <StatCard label="Messages" value={num(o.engagement.messages)} sub={`${num(o.engagement.likes)} likes · ${num(o.engagement.passes)} passes`} />
        <StatCard label="Suspended" value={num(o.users.suspended)} sub={`${num(o.users.admins)} admin${o.users.admins === 1 ? '' : 's'} · ${num(o.engagement.upcomingEvents)} upcoming events`} />
      </div>

      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Activity over time</h3>
          <div className="spacer" />
          <div className="seg" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>{r} days</button>
            ))}
          </div>
        </div>
        {!series ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="chart-grid">
            <div><div className="chart-title">New users <b>{sum('signups')}</b></div><BarChart data={pick('signups')} label="new users" /></div>
            <div><div className="chart-title">Likes <b>{sum('likes')}</b></div><BarChart data={pick('likes')} color="#fb7185" label="likes" /></div>
            <div><div className="chart-title">Matches <b>{sum('matches')}</b></div><BarChart data={pick('matches')} color="#9f1239" label="matches" /></div>
            <div><div className="chart-title">Messages <b>{sum('messages')}</b></div><BarChart data={pick('messages')} color="#b0177a" label="messages" /></div>
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="card">
          <h3>Users by community</h3>
          <Breakdown items={Object.keys(COMMUNITY_LABEL).map((k) => ({ label: COMMUNITY_LABEL[k], value: o.byCommunity[k] || 0, color: COMMUNITY_COLOR[k] }))} />
        </div>
        <div className="card">
          <h3>Plans</h3>
          <Breakdown items={[{ label: 'Free', value: o.byPlan.free || 0, color: '#cbb4bd' }, { label: 'Premium', value: o.byPlan.premium || 0 }]} />
          <h3 style={{ marginTop: '1.25rem' }}>Looking for</h3>
          <Breakdown items={['long-term', 'dating', 'friendship'].map((k) => ({ label: k, value: o.byLookingFor[k] || 0, color: '#fb7185' }))} />
        </div>
        <div className="card">
          <h3>Top cities</h3>
          {o.topCities.length ? (
            <Breakdown items={o.topCities.map((c) => ({ label: c.city, value: c.count, color: '#b0177a' }))} total={o.users.profileComplete} />
          ) : <p className="muted">No cities yet.</p>}
        </div>
      </div>

      <div className="card">
        <div className="row"><h3 style={{ margin: 0 }}>Recent admin activity</h3><div className="spacer" /><Link href="/admin/logs" className="small">See all</Link></div>
        {logs.length === 0 ? <p className="muted">No admin changes yet.</p> : (
          <table className="table" style={{ marginTop: '0.75rem' }}>
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}>
                  <td className="muted">{timeAgo(l.createdAt)}</td>
                  <td>{l.adminEmail}</td>
                  <td>{ACTION_LABEL[l.action] || l.action}</td>
                  <td>{l.targetType === 'user' && l.targetId && !l.action.endsWith('delete') ? <Link href={`/admin/users/${l.targetId}`}>{l.targetLabel}</Link> : l.targetLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
