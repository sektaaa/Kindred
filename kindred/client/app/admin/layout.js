'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/admins', label: 'Admins' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/logs', label: 'Activity log' },
];

// Every /admin page sits inside this guard: non-admins are sent away.
// The API checks the admin role on every request as well.
export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace('/discover');
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') return <p className="muted center">Loading…</p>;

  return (
    <div className="admin">
      <nav className="admin-tabs" aria-label="Admin">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={active ? 'active' : ''}>{t.label}</Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
