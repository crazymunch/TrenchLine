'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { signIn } from 'next-auth/react';
import { soundEffects } from '../../services/soundEffects';
import {
  User,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { GoogleMark } from '../brand/GoogleMark';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Matches the server's policy in `src/lib/auth.ts`. */
const MIN_PASSWORD_LENGTH = 10;

/**
 * Sign in, or create an account. Two modes, because they are two decisions.
 *
 * This form used to be one thing that did both, and it labelled its password
 * field **"Password (Optional / Demo)"** — accurately, because the server
 * signed you in on an email alone and created the account if it did not
 * recognise the address. The UI was built around the bypass.
 *
 * Registration is `POST /api/auth/register` now. It returns no session: the
 * form signs in afterwards through the same path as any other sign-in, so
 * there is exactly one place that decides whether a caller gets a session.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [commanderName, setCommanderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const registering = mode === 'register';

  const switchMode = (next: 'signin' | 'register') => {
    setMode(next);
    setError(null);
    setPassword('');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    soundEffects.playCathedralBell();
    await signIn('google', { callbackUrl: window.location.href });
  };

  /** Sign in with an email and password. Both are required, by both sides. */
  const enter = async () => {
    const res = await signIn('credentials', { redirect: false, email, password });
    if (res?.error) {
      /*
        One message for every failure. The server cannot tell the difference
        between "no such account" and "wrong password" without becoming an
        oracle for which addresses are registered, and neither can this.
      */
      setError('Those credentials were not accepted.');
      return false;
    }
    soundEffects.playCathedralBell();
    onClose();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsLoading(true);
    try {
      if (registering) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: commanderName || undefined }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'That account could not be created.');
          return;
        }
      }
      await enter();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="COMMANDER AUTHENTICATION"
    >
      {/* Modal Body */}
      <div className="p-6 space-y-5 font-mono text-xs">
  
        {error && (
          <div className="p-3 bg-theme-accent/30 border border-theme-accent rounded text-status-error flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/*
          1. Google OAuth, and then a form that is emphatically NOT Google's.

          This modal's shape — the official multi-colour Google mark, and two
          fields below it separated by a thin rule reading "or with commander
          credentials" — is the shape of a Google credential-harvesting page.
          Safe Browsing scores DOM structure and a screenshot, and that pattern
          on a young `.app` domain (a registry Google runs and scans hard) is
          most of why trenchline.app was flagged as a deceptive page.

          Nothing here was wrong; it was ambiguous. So the ambiguity is what is
          removed: the Google button says where it sends you, the divider names
          the alternative rather than merely marking one, and the password
          field says whose password it is. A reader could work all three out
          before; a classifier reading structure could not, and neither could a
          visitor in a hurry.

          The `GoogleMark` itself stays. It is vendored, it is used correctly
          on a real "Sign in with Google" button, and removing it to please a
          heuristic would make the button worse for everybody.
        */}
        <div className="space-y-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F1F3F5] text-[#1F1F1F] font-bold text-xs rounded shadow flex items-center justify-center space-x-3 transition-colors"
          >
            <GoogleMark />
            <span>Continue with Google</span>
          </button>
          <p className="text-[11px] leading-[1.5] text-theme-muted text-center">
            Google handles that sign-in on their own site. TrenchLine never sees
            your Google password.
          </p>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-theme-border" />
            <span className="flex-shrink mx-3 text-theme-muted text-xs sm:text-[10px] uppercase font-bold text-center">
              or use a TrenchLine account
            </span>
            <div className="flex-grow border-t border-theme-border" />
          </div>
        </div>

        {/* 2. Email and password */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {registering && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="text-xs sm:text-[10px] uppercase text-theme-muted block">
                Commander / Player Name:
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="nickname"
                  placeholder="Commander Valerius"
                  value={commanderName}
                  onChange={(e) => setCommanderName(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email" className="text-xs sm:text-[10px] uppercase text-theme-muted block">
              Email Address:
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            {/*
              Whose password, said on the label itself.

              "Password:" under a Google button is the field a scanner — and a
              hurried person — reads as a Google password box. This one is a
              TrenchLine password, stored as a bcrypt hash on this site's own
              database and nowhere else, and the label is the cheapest place to
              say so.
            */}
            <label htmlFor="auth-password" className="text-xs sm:text-[10px] uppercase text-theme-muted block">
              TrenchLine Account Password:
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                minLength={MIN_PASSWORD_LENGTH}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                required
              />
            </div>
            {registering && (
              <p className="text-[10px] text-theme-muted pt-0.5">
                At least {MIN_PASSWORD_LENGTH} characters. Length is all that is asked for —
                a long phrase you can remember beats a short one you cannot.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors mt-2 disabled:opacity-60"
          >
            {registering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{registering ? 'Create Account' : 'Enter the Crusade'}</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode(registering ? 'signin' : 'register')}
            className="w-full text-center text-[11px] text-theme-muted hover:text-theme-text underline underline-offset-2 pt-1"
          >
            {registering
              ? 'Already have an account? Sign in'
              : 'No account yet? Create one'}
          </button>
        </form>

      </div>
    </Sheet>
  );
};
