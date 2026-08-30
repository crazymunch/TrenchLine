import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';

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
    icon: [
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Cinzel:wght@400;600;700;800&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Oswald:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..800;1,400..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0C0E12] text-[#ECEFF4] min-h-[100dvh] antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
