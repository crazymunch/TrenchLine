'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { WarbandDashboard } from '@/components/builder/WarbandDashboard';

/**
 * The roster list, and the redirect to whichever roster is active.
 *
 * `/roster` is the index; `/roster/[id]` is a specific warband. Landing on the
 * index with a warband already active sends you to its URL, so the address bar
 * always names what is on screen and the link is copyable without the user
 * having to find a share button.
 */
export default function RosterIndexPage() {
  const router = useRouter();
  const activeId = useStore((s) => s.activeWarbandId);

  useEffect(() => {
    if (activeId) router.replace(`/roster/${encodeURIComponent(activeId)}`);
  }, [activeId, router]);

  return <WarbandDashboard />;
}
