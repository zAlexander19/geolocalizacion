import React from 'react'

export default function OfflineToast({ visible = false }) {
  if (!visible) return null

  return (
    <div className="offline-toast" role="status" aria-live="polite">
      <p>Ups... no hay conexión a internet. Por favor, vuelva a intentarlo</p>
    </div>
  )
}
