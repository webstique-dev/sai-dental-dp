import { Modal } from './Modal'
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react'

export function ReusableFormModal({
  open = false,
  onClose,
  onSubmit,
  title,
  subtitle,
  children,
  submitText = 'Save Record',
  submitLoadingText = 'Saving...',
  cancelText = 'Cancel',
  submitting = false,
  loading = false,
  disabled = false,
  maxWidth = '600px',
  error,
  warning,
  variant = 'primary',
}) {
  const isLoading = submitting || loading

  const handleClose = () => {
    if (isLoading) return
    if (onClose) onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isLoading || disabled) return
    if (onSubmit) onSubmit(e)
  }

  const isDanger = variant === 'danger'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      maxWidth={maxWidth}
      closeOnBackdropClick={!isLoading}
    >
      <form onSubmit={handleSubmit} className="reusable-form-modal">
        {error && (
          <div className="alert alert-error mb-4" role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {warning && (
          <div className="alert alert-warning mb-4" role="status" style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <div className="form-modal-body-content">{children}</div>

        <div className="form-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', marginTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            disabled={isLoading || disabled}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isLoading ? submitLoadingText : submitText}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export { ReusableFormModal as FormModal }
export default ReusableFormModal
