'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CommunityBadge from './CommunityBadge';
import CalmToggle from './CalmToggle';
import Heart from './Heart';

const MEMBER_LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/matches', label: 'Matches' },
  { href: '/events', label: 'Events' },
  { href: '/profile', label: 'My profile' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  const onLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="nav">
      <nav className="nav-inner" aria-label="Main">
        <Link href={!user ? '/' : isAdmin ? '/admin' : '/discover'} className="brand">
          <Heart size={26} className="logo-heart" />
          <span>Kindred</span>
        </Link>
        {user && !isAdmin && <CommunityBadge community={user.community} />}
        {isAdmin && <span className="community admin-badge">Admin</span>}
        <div className="nav-links">
          {user ? (
            <>
              {!isAdmin &&
                MEMBER_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? 'active' : ''}>
                    {l.label}
                  </Link>
                ))}
              {isAdmin && <span className="small muted">{user.profile?.name || user.email}</span>}
              <CalmToggle />
              <button className="linklike" onClick={onLogout}>Log out</button>
            </>
          ) : (
            <>
              <CalmToggle />
              <Link href="/login" className={pathname === '/login' ? 'active' : ''}>Log in</Link>
              <Link href="/signup" className="btn" style={{ color: '#fff' }}>Join free</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
