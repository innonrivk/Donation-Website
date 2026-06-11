import { motion, AnimatePresence } from 'framer-motion';
import './ConfirmDeleteModal.css';

/**
 * ConfirmDeleteModal — Reusable premium modal for delete confirmations.
 * Uses Framer Motion for smooth backdrop and card animations.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controls visibility.
 * @param {string} props.title - Modal title (e.g. "Delete Project").
 * @param {string} props.message - Descriptive text for the action.
 * @param {boolean} props.isLoading - Disables buttons and shows spinner when true.
 * @param {() => void} props.onConfirm - Callback when confirm is clicked.
 * @param {() => void} props.onCancel - Callback when cancel/close is clicked.
 * @returns {JSX.Element}
 */
export default function ConfirmDeleteModal({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="confirm-modal-overlay">
          {/* Backdrop wrapper */}
          <motion.div
            className="confirm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onCancel}
          />

          {/* Modal Container */}
          <motion.div
            className="confirm-modal-card glass"
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <div className="confirm-modal-card__header">
              <span className="confirm-modal-card__warning-icon">⚠️</span>
              <h3>{title}</h3>
            </div>

            <div className="confirm-modal-card__body">
              <p dangerouslySetInnerHTML={{ __html: message }} />
            </div>

            <div className="confirm-modal-card__actions">
              <button
                type="button"
                className="cms-btn cms-btn--secondary"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn--danger"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="btn-spinner btn-spinner--danger" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
