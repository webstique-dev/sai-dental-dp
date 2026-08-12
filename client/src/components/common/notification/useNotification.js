import { useContext } from 'react'
import { NotificationContext } from './NotificationProvider'

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    // Fallback object to avoid crashing if used outside provider
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      remove: () => {},
    }
  }
  return context
}

export default useNotification
