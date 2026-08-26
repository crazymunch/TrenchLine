'use client';

import React from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

interface Props {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<Props> = ({ children }) => {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
};
