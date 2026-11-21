'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Client-side route guard for member pages. The API enforces the same rules server-side.
export default function Protected({ children, needsProfile = true, allowAdmin = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const blockAdmin = isAdmin && !allowAdmin;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (blockAdmin) router.replace('/admin');
    else if (isAdmin) return;
    else if (needsProfile && !user.profileComplete) router.replace('/profile?onboarding=1');
  }, [user, loading, needsProfile, router, isAdmin, blockAdmin]);

  if (loading || !user || blockAdmin || (!isAdmin && needsProfile && !user.profileComplete)) {
    return <p className="muted center">Loading…</p>;
  }
  return children;
}
