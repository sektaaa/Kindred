'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Client-side route guard for member pages. The API enforces the same rules server-side.
export default function Protected({ children, needsProfile = true }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (isAdmin) router.replace('/admin');
    else if (needsProfile && !user.profileComplete) router.replace('/profile?onboarding=1');
  }, [user, loading, needsProfile, router, isAdmin]);

  if (loading || !user || isAdmin || (needsProfile && !user.profileComplete)) {
    return <p className="muted center">Loading…</p>;
  }
  return children;
}
