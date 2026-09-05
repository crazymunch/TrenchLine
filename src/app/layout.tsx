import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Archivo, IBM_Plex_Mono, Newsreader } from 'next/font/google';

/*
  Self-hosted, not fetched from Google at runtime.

  The three faces used to arrive through a `<link>` to fonts.googleapis.com,
  which meant the typography depended on a third party being up, the CSP had to
  allow that third party, and every visitor's IP address reached it before a
  single word rendered. `next/font/google` downloads the files at BUILD time
  and serves them from this origin, so `font-src 'self'` in next.config.mjs is
  the whole policy.

  The weights and styles are exactly the ones the old URL requested, so nothing
  renders differently. Each exposes a CSS variable that `globals.css` already
  names.
*/
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TrenchLine | Trench Crusade Tactical Warband & Campaign Hub',
  description:
    'Tactical warband builder, tabletop combat HUD companion, multiplayer campaign manager, and rule customizer for Trench Crusade.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'TrenchLine',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    /*
      Smallest first: browsers take the best match for the tab strip, and the
      two favicons are the CUT-OUT variant — the mark is a disc, and a dark
      square around it on a tab strip draws a box around nothing. The 192 and
      512 stay full-bleed because they are also the PWA icons, where every
      pixel has to be artwork.
    */
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) to report anything but 0 on iOS.
  viewportFit: 'cover',
  themeColor: '#0C0E12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${archivo.variable} ${plexMono.variable} ${newsreader.variable} `
          + 'bg-theme-base text-theme-text min-h-[100dvh] antialiased'}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
