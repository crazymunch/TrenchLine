'use client';

import React from 'react';
import { useStore } from '../../store/useStore';
import { X, BookOpen, Tag } from 'lucide-react';

export const KeywordPopover: React.FC = () => {
  const { activeKeyword, setActiveKeyword } = useStore();

  if (!activeKeyword) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-md rounded-md p-5 shadow-2xl space-y-3">
        
        <div className="flex items-center justify-between border-b border-theme-border pb-2">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-theme-primary" />
            <h3 className="font-gothic font-bold text-lg text-theme-text">{activeKeyword.name}</h3>
          </div>
          <button
            onClick={() => setActiveKeyword(null)}
            className="tap p-1 text-theme-muted hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-xs sm:text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-theme-elevated text-theme-primary font-bold border border-theme-border">
            {activeKeyword.category} Keyword
          </span>
          <p className="text-xs font-semibold text-theme-text font-mono">{activeKeyword.summary}</p>
          <p className="text-xs text-theme-muted leading-relaxed bg-theme-base p-3 rounded border border-theme-border">
            {activeKeyword.fullText}
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setActiveKeyword(null)}
            className="px-3 py-1 bg-theme-elevated hover:bg-theme-border text-theme-text rounded font-mono text-xs font-bold uppercase transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
