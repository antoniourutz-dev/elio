import type { MouseEvent } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Baieztatu',
  cancelLabel = 'Utzi',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => (
  isOpen ? (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#142837]/48 p-6 backdrop-blur-md animate-[fade-in_160ms_ease-out]"
        onClick={onCancel}
      >
        <div
          className="w-full max-w-[340px] rounded-[28px] border border-[#d1dfe5]/90 bg-white/98 p-7 shadow-[0_32px_80px_rgba(30,60,90,0.22),0_8px_24px_rgba(30,60,90,0.1)] animate-[modal-rise_180ms_ease-out]"
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <p className="text-[1.1rem] font-black tracking-[-0.02em] text-[var(--text)] mb-2">{title}</p>
          <p className="text-[0.92rem] font-bold text-[var(--muted)] leading-relaxed m-0">{message}</p>
          <div className="flex gap-2.5 mt-5 justify-end">
            <button 
              type="button" 
              className="inline-flex items-center justify-center min-h-[46px] px-4 rounded-full font-extrabold border border-[rgba(216,226,241,0.92)] bg-white/96 text-[var(--text)] cursor-pointer transition-transform hover:-translate-y-0.5"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button 
              type="button" 
              className="inline-flex items-center justify-center min-h-[46px] px-4 rounded-full font-extrabold border border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-text)] cursor-pointer transition-transform hover:-translate-y-0.5"
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    ) : null
);
