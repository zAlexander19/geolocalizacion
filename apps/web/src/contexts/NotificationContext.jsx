import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotificationBanner from '../components/ErrorBanner.jsx'
import OfflineToast from '../components/OfflineToast.jsx'
import { subscribeToOfflineAttempts } from '../lib/networkStatus.js'

const NotificationContext = createContext(null)

const initialOfflineState = typeof navigator !== 'undefined' ? !navigator.onLine : false

export function NotificationProvider({ children }) {
  const [errorMessage, setErrorMessage] = useState(null)
  const [errorDetail, setErrorDetail] = useState(null)
  const [offline, setOffline] = useState(initialOfflineState)
  const [offlineToastVisible, setOfflineToastVisible] = useState(false)
  const toastTimer = useRef(null)
  const errorTimer = useRef(null)

  const clearErrorTimer = useCallback(() => {
    if (errorTimer.current) {
      clearTimeout(errorTimer.current)
      errorTimer.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const goOnline = () => {
      setOffline(false)
      setErrorMessage(null)
      setErrorDetail(null)
      setOfflineToastVisible(false)
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
        toastTimer.current = null
      }
    }
    const goOffline = () => {
      setOffline(true)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const handleOfflineAttempt = useCallback(() => {
    setOfflineToastVisible(true)
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }
    toastTimer.current = setTimeout(() => {
      setOfflineToastVisible(false)
      toastTimer.current = null
    }, 4200)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const unsubscribe = subscribeToOfflineAttempts(handleOfflineAttempt)
    return () => {
      unsubscribe()
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
        toastTimer.current = null
      }
    }
  }, [handleOfflineAttempt])

  const reportError = useCallback((message, detail = null) => {
    clearErrorTimer()
    setErrorMessage(message)
    setErrorDetail(detail)
  }, [clearErrorTimer])

  const dismissError = useCallback(() => {
    setErrorMessage(null)
    setErrorDetail(null)
    clearErrorTimer()
  }, [clearErrorTimer])

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,
        retry: 1,
        onError: (error) => {
          if (axios.isCancel(error) && error.message === 'offline') {
            return
          }
          const userMessage = 'Ups... tuvimos problemas, vuelve a intentarlo más tarde.'
          const detail = error?.message || null
          reportError(userMessage, detail)
        },
      },
    },
  }), [reportError])

  const contextValue = useMemo(() => ({
    errorMessage,
    errorDetail,
    offline,
    reportError,
    dismissError,
  }), [errorMessage, errorDetail, offline, reportError, dismissError])

  useEffect(() => {
    if (!errorMessage) return undefined

    errorTimer.current = setTimeout(() => {
      setErrorMessage(null)
      setErrorDetail(null)
      errorTimer.current = null
    }, 4200)

    return () => {
      clearErrorTimer()
    }
  }, [errorMessage, clearErrorTimer])

  return (
    <NotificationContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
      <NotificationBanner />
      <OfflineToast visible={offlineToastVisible} />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
