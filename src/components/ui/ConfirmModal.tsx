'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete Permanently',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#B22222] w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
        
        {/* Header */}
        <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#B22222]/20 border border-[#B22222] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#FF4D6D]" />
            </div>
            <h3 className="font-gothic font-bold text-base text-[#ECEFF4] tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[#8E95A5] hover:text-white p-1 rounded hover:bg-[#323846] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 font-mono text-xs text-[#ECEFF4]">
          <p className="leading-relaxed whitespace-pre-line">
            {message}
          </p>
          <div className="p-2.5 bg-[#0C0E12] border border-[#323846] rounded text-[11px] text-[#8E95A5]">
            ⚠️ This operation is permanent and cannot be undone.
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#8E95A5] hover:text-white rounded text-xs font-mono font-bold uppercase transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 shadow ${
              isDestructive
                ? 'bg-[#B22222] hover:bg-[#900000] text-white'
                : 'bg-[#D4AF37] hover:bg-[#C49F27] text-black'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmLabel}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
