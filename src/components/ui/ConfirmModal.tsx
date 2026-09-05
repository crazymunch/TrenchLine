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
      <div className="bg-theme-surface border-2 border-status-error w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container max-h-[90dvh]">
        
        {/* Header */}
        <div className="flex-shrink-0 p-4 bg-theme-elevated border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-status-error/20 border border-status-error flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-status-error" />
            </div>
            <h3 className="font-gothic font-bold text-base text-theme-text tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-theme-muted hover:text-theme-text p-1 rounded hover:bg-theme-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-3 font-mono text-xs text-theme-text">
          <p className="leading-relaxed whitespace-pre-line">
            {message}
          </p>
          <div className="p-2.5 bg-theme-base border border-theme-border rounded text-xs sm:text-[11px] text-theme-muted">
            ⚠️ This operation is permanent and cannot be undone.
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-theme-base border-t border-theme-border flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-muted hover:text-theme-text rounded text-xs font-mono font-bold uppercase transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 shadow ${
              isDestructive
                ? 'bg-status-error hover:bg-status-error text-white'
                : 'bg-theme-primary hover:bg-theme-primary-hover text-theme-base'
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
