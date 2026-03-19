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
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
      >
        <motion.div
          className="modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <p className="modal-title">{title}</p>
          <p className="modal-message">{message}</p>
          <div className="modal-actions">
            <button type="button" className="admin-secondary-button" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="button" className="admin-primary-button admin-secondary-button-danger" onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
