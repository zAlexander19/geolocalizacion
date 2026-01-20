import React from 'react'
import { useNotification } from '../contexts/NotificationContext.jsx'

export default function ErrorBanner() {
  const { errorMessage, errorDetail, dismissError } = useNotification()
  if (!errorMessage) return null

  return (
    <div className="notification-banner">
      <div className="notification-banner__content">
        <div className="notification-banner__icon" aria-hidden="true">
          ⚠️
        </div>
        <div className="notification-banner__copy">
          <p className="notification-banner__headline">Ups... tuvimos problemas, vuelve a intentarlo más tarde.</p>
          {errorDetail && (
            <p className="notification-banner__detail">{errorDetail}</p>
          )}
        </div>
        <button
          type="button"
          className="notification-banner__close"
          onClick={dismissError}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
