import { useEffect, useId, useRef } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2, X } from 'lucide-react'

const VARIANT_ICONS = {
  danger: AlertTriangle,
  warning: AlertCircle,
  default: Info,
}

export default function ConfirmationDialog({
  open = false,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loadingText = 'Please wait…',
  variant = 'default',
  loading = false,
  showCloseButton = true,
  icon: IconOverride,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef(null)
  const cancelRef = useRef(null)
  const onCancelRef = useRef(onCancel)
  const loadingRef = useRef(loading)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!loadingRef.current && onCancelRef.current) onCancelRef.current()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const list = Array.from(focusables).filter((el) => !el.disabled)
        if (list.length === 0) return
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => {
      if (cancelRef.current) cancelRef.current.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [open])

  if (!open) return null

  const Icon = IconOverride || VARIANT_ICONS[variant] || Info

  const handleConfirm = () => {
    if (!loading && onConfirm) onConfirm()
  }

  const handleCancel = () => {
    if (!loading && onCancel) onCancel()
  }

  const variantClass =
    variant === 'danger' ? ' cd-danger' : variant === 'warning' ? ' cd-warning' : ''

  return (
    <div className="modal-backdrop cd-backdrop" onMouseDown={handleCancel}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descId : undefined}
        className={`cd-card${variantClass}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cd-head">
          <div className="cd-icon" aria-hidden="true">
            <Icon size={22} />
          </div>
          <h4 id={titleId} className="cd-title">
            {title}
          </h4>
          {showCloseButton && (
            <button
              type="button"
              className="modal-close cd-close"
              aria-label="Close"
              onClick={handleCancel}
              disabled={loading}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {message && (
          <div id={descId} className="cd-message">
            {message}
          </div>
        )}

        <div className="cd-footer">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary cd-cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn cd-confirm${variant === 'danger' ? ' btn-danger' : ' btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={16} className="cd-spin" aria-hidden="true" />}
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}