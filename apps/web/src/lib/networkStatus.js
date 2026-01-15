const offlineAttemptListeners = new Set()

export function subscribeToOfflineAttempts(listener) {
  offlineAttemptListeners.add(listener)
  return () => offlineAttemptListeners.delete(listener)
}

export function reportOfflineAttempt() {
  offlineAttemptListeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      console.error('Error notifying offline listener', error)
    }
  })
}
