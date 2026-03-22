import type { MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-[100] bg-[#142837]/48 backdrop-blur-md flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
      >
        <motion.div
          className="bg-white/98 border border-[#d1dfe5]/90 rounded-[28px] p-7 max-w-[340px] w-full shadow-[0_32px_80px_rgba(30,60,90,0.22),0_8px_24px_rgba(30,60,90,0.1)]"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <p className="text-[1.1rem] font-black tracking-[-0.02em] text-[#203143] mb-2">{title}</p>
          <p className="text-[0.92rem] font-bold text-[#7a8d9d] leading-relaxed m-0">{message}</p>
          <div className="flex gap-2.5 mt-5 justify-end">
            <button 
              type="button" 
              className="inline-flex items-center justify-center min-h-[46px] px-4 rounded-full font-extrabold border border-[rgba(216,226,241,0.92)] bg-white/96 text-[#203143] cursor-pointer transition-transform hover:-translate-y-0.5" 
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button 
              type="button" 
              className="inline-flex items-center justify-center min-h-[46px] px-4 rounded-full font-extrabold border border-[#efc2bb] bg-[#fff0ee] text-[#b7594d] cursor-pointer transition-transform hover:-translate-y-0.5" 
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
