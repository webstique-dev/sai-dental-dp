import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Notification({ id, type = 'info', message, title, onClose, autoDismiss = 3000 }) {
  const Icon = ICONS[type] || Info

  useEffect(() => {
    if (!autoDismiss || autoDismiss <= 0) return
    const timer = setTimeout(() => {
      onClose(id)
    }, autoDismiss)
    return () => clearTimeout(timer)
  }, [id, autoDismiss, onClose])

  const isAlert = type === 'error' || type === 'warning'

  return (
    <div
      className={`toast-card toast-${type}`}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
    >
      <div className="toast-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => onClose(id)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}
