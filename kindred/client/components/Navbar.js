'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/LanguageContext';
import CommunityBadge from './CommunityBadge';
import CalmToggle from './CalmToggle';
import LanguageSwitcher from './LanguageSwitcher';
import Heart from './Heart';

const MEMBER_LINKS = [
  { href: '/discover', key: 'nav.discover' },
  { href: '/matches', key: 'nav.matches' },
  { href: '/events', key: 'nav.events' },
  { href: '/profile', key: 'nav.profile' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useT();
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
                    {t(l.key)}
                  </Link>
                ))}
              {isAdmin && <span className="small muted">{user.profile?.name || user.email}</span>}
              <LanguageSwitcher />
              <CalmToggle />
              <button className="linklike" onClick={onLogout}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <CalmToggle />
              <Link href="/login" className={pathname === '/login' ? 'active' : ''}>{t('nav.login')}</Link>
              <Link href="/signup" className="btn" style={{ color: '#fff' }}>{t('nav.join')}</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
