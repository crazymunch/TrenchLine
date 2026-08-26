'use client';

import React from 'react';
import { useStore } from '../../store/useStore';
import { X, BookOpen, Tag } from 'lucide-react';

export const KeywordPopover: React.FC = () => {
  const { activeKeyword, setActiveKeyword } = useStore();

  if (!activeKeyword) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-md rounded-md p-5 shadow-2xl space-y-3">
        
        <div className="flex items-center justify-between border-b border-[#323846] pb-2">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">{activeKeyword.name}</h3>
          </div>
          <button
            onClick={() => setActiveKeyword(null)}
            className="p-1 text-[#8E95A5] hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#20242E] text-[#D4AF37] font-bold border border-[#323846]">
            {activeKeyword.category} Keyword
          </span>
          <p className="text-xs font-semibold text-[#ECEFF4] font-mono">{activeKeyword.summary}</p>
          <p className="text-xs text-[#8E95A5] leading-relaxed bg-[#0C0E12] p-3 rounded border border-[#323846]">
            {activeKeyword.fullText}
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setActiveKeyword(null)}
            className="px-3 py-1 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded font-mono text-xs font-bold uppercase transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
