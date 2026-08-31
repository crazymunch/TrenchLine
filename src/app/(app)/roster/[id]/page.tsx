'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { WarbandDashboard } from '@/components/builder/WarbandDashboard';

/**
 * A warband at its own URL.
 *
 * The id in the path selects the warband, so a link opens the roster it names
 * rather than whichever one the device happened to have active. That is the
 * whole point of the route: a player can send a teammate their list.
 *
 * An id the device does not hold is left alone rather than redirected. The
 * warband may still be arriving from the cloud sync, and bouncing the user to
 * a different roster mid-fetch is worse than a moment of the dashboard.
 */
export default function RosterPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? decodeURIComponent(params.id) : null;

  const setActiveWarbandId = useStore((s) => s.setActiveWarbandId);
  const known = useStore((s) => s.warbands.some((w) => w.id === id));

  useEffect(() => {
    if (id && known) setActiveWarbandId(id);
  }, [id, known, setActiveWarbandId]);

  return <WarbandDashboard />;
}
