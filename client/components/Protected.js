'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Client-side route guard. The API enforces the same rules server-side.
export default function Protected({ children, needsProfile = true }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (needsProfile && !user.profileComplete) router.replace('/profile?onboarding=1');
  }, [user, loading, needsProfile, router]);

  if (loading || !user || (needsProfile && !user.profileComplete)) {
    return <p className="muted center">Loading…</p>;
  }
  return children;
}
