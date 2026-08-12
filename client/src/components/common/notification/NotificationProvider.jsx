import { createContext, useState, useCallback, useMemo } from 'react'
import { Notification } from './Notification'

export const NotificationContext = createContext(null)

let idCounter = 0

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showNotification = useCallback(({ type = 'info', message, title, autoDismiss = 3000 }) => {
    const id = `toast-${Date.now()}-${++idCounter}`
    setNotifications((prev) => [...prev, { id, type, message, title, autoDismiss }])
    return id
  }, [])

  const notify = useMemo(
    () => ({
      show: showNotification,
      success: (message, title, autoDismiss) =>
        showNotification({ type: 'success', message, title, autoDismiss }),
      error: (message, title, autoDismiss) =>
        showNotification({ type: 'error', message, title, autoDismiss }),
      warning: (message, title, autoDismiss) =>
        showNotification({ type: 'warning', message, title, autoDismiss }),
      info: (message, title, autoDismiss) =>
        showNotification({ type: 'info', message, title, autoDismiss }),
      remove: removeNotification,
    }),
    [showNotification, removeNotification],
  )

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {notifications.map((n) => (
          <Notification
            key={n.id}
            id={n.id}
            type={n.type}
            title={n.title}
            message={n.message}
            autoDismiss={n.autoDismiss}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
