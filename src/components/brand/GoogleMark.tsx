/**
 * Google's "G", as Google draws it.
 *
 * It was already in the app — inline in `AuthModal`, in the four official
 * brand colours — and the landing page needs the same mark, so it lives in one
 * place rather than two. Two copies of someone else's trademark is how one of
 * them ends up recoloured to match a theme.
 *
 * Deliberately NOT fetched from `developers.google.com`. `next.config.mjs`
 * sets `img-src 'self' data: blob:` plus two avatar hosts, so a Google-hosted
 * URL would be blocked by the CSP with no visible error — and loosening a
 * content policy for a logo is a bad trade even when it works.
 *
 * Do not recolour it, do not redraw it, and do not swap it for a Lucide icon:
 * a generic key or arrow beside the words "with Google" is worse than no mark,
 * because it implies a Google sign-in that is not one.
 */
import React from 'react';

export const GoogleMark: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);
