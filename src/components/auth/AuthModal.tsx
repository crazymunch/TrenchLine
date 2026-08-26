'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useStore } from '../../store/useStore';
import { THEMES } from '../../types/theme';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  LogIn, 
  Shield, 
  Sparkles, 
  AlertCircle,
  Crown
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentTheme } = useStore();
  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [commanderName, setCommanderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-md rounded-md shadow-2xl overflow-hidden bevel-container">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-2.5">
            <Crown className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
              COMMANDER AUTHENTICATION
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8E95A5] hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 font-mono text-xs">
          
          {error && (
            <div className="p-3 bg-[#8B0000]/30 border border-[#8B0000] rounded text-[#E53935] flex items-center space-x-2">
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
              <div className="flex-grow border-t border-[#323846]" />
              <span className="flex-shrink mx-3 text-[#8E95A5] text-[10px] uppercase font-bold">or with commander credentials</span>
              <div className="flex-grow border-t border-[#323846]" />
            </div>
          </div>

          {/* 2. Direct Credentials Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8E95A5] block">Commander / Player Name:</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#8E95A5] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Commander Valerius"
                  value={commanderName}
                  onChange={(e) => setCommanderName(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-3 py-2 text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8E95A5] block">Email Address:</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#8E95A5] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="commander@trenchline.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-3 py-2 text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8E95A5] block">Password (Optional / Demo):</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8E95A5] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-3 py-2 text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Enter the Crusade</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
