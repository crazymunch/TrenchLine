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
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [commanderName, setCommanderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    soundEffects.playCathedralBell();
    await signIn('google', { callbackUrl: window.location.href });
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        name: commanderName || email.split('@')[0]
      });

      if (res?.error) {
        setError('Authentication failed. Please verify credentials.');
      } else {
        soundEffects.playCathedralBell();
        onClose();
      }
    } catch (_err) {
      setError('An error occurred during authentication.');
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

        {/* 1. Google OAuth Button */}
        <div className="space-y-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F1F3F5] text-[#1F1F1F] font-bold text-xs rounded shadow flex items-center justify-center space-x-3 transition-colors"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Sign in with Google</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-theme-border" />
            <span className="flex-shrink mx-3 text-theme-muted text-xs sm:text-[10px] uppercase font-bold">or with commander credentials</span>
            <div className="flex-grow border-t border-theme-border" />
          </div>
        </div>

        {/* 2. Direct Credentials Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Commander / Player Name:</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Commander Valerius"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Email Address:</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="commander@trenchline.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Password (Optional / Demo):</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Enter the Crusade</span>
          </button>
        </form>

      </div>
    </Sheet>
  );
};
