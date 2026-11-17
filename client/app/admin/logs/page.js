'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errorText } from '@/lib/api';
import { fmtDateTime, ACTION_LABEL } from '@/lib/format';

function describe(details) {
  if (!details) return '';
  if (Array.isArray(details)) return details.join(', ');
  return Object.entries(details)
    .map(([k, v]) => (Array.isArray(v) && v.length === 2 ? `${k}: ${v[0] ?? '—'} → ${v[1] ?? '—'}` : k))
    .join(' · ');
}

export default function AdminLogs() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/admin/logs?limit=200').then(setLogs).catch((e) => setError(errorText(e))); }, []);

  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 0 }}>Activity log</h1>
        <p className="muted" style={{ margin: 0 }}>Every change an admin makes is recorded here, newest first.</p>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {!logs && <tr><td colSpan={5} className="muted">Loading…</td></tr>}
            {logs?.length === 0 && <tr><td colSpan={5} className="muted">No admin changes yet.</td></tr>}
            {logs?.map((l) => (
              <tr key={l._id}>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                <td>{l.adminEmail}</td>
                <td>{ACTION_LABEL[l.action] || l.action}</td>
                <td>{l.targetType === 'user' && l.targetId && !l.action.endsWith('delete') ? <Link href={`/admin/users/${l.targetId}`}>{l.targetLabel}</Link> : l.targetLabel}</td>
                <td className="muted small">{describe(l.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
