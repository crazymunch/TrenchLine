'use client';

/**
 * "Are you sure?", for something that cannot be undone.
 *
 * On `Sheet` rather than its own `fixed inset-0` (docs/RESTRUCTURE-PLAN.md
 * §3.1), which gives it the scroll lock, the focus trap and focus returned to
 * whatever opened it.
 *
 * `dismissible={false}` is the deliberate part. Every other overlay in the app
 * closes on Escape and on a click outside, and this one must not: a destructive
 * confirm answered by a stray tap on the backdrop is not an answer. The only
 * ways out are the two buttons, which is why both are spelled out and the
 * cancel is the wider target.
 */
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';

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
  onCancel,
}) => (
  <Sheet
    open={isOpen}
    onClose={onCancel}
    dismissible={false}
    size="sm"
    label={title}
    title={
      <span className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-status-error bg-status-error/20">
          <AlertTriangle className="h-4 w-4 text-status-error" />
        </span>
        {title}
      </span>
    }
    footer={
      <>
        <button
          onClick={onCancel}
          className="flex-1 rounded bg-theme-elevated px-4 py-2 font-mono text-xs font-bold uppercase text-theme-muted transition-all hover:bg-theme-border hover:text-theme-text"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-4 py-2 font-mono text-xs font-bold uppercase transition-all ${
            isDestructive
              ? 'bg-status-error text-white hover:bg-status-error'
              : 'bg-theme-primary text-theme-base hover:bg-theme-primary-hover'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{confirmLabel}</span>
        </button>
      </>
    }
  >
    <div className="space-y-3 font-mono text-xs text-theme-text">
      <p className="whitespace-pre-line leading-relaxed">{message}</p>
      <div className="rounded border border-theme-border bg-theme-base p-2.5 text-xs text-theme-muted sm:text-[11px]">
        ⚠️ This operation is permanent and cannot be undone.
      </div>
    </div>
  </Sheet>
);
