import React, { createContext, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function show(message, type = 'success', durationMs = 2500) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), durationMs)
  }

  const value = useMemo(() => ({ show }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-50 top-4 right-4 space-y-2 w-[90%] max-w-sm md:max-w-xs">
        {toasts.map(t => (
          <div key={t.id} className={`toast-enter rounded-lg px-4 py-3 shadow-lg text-white flex items-start gap-3 ring-1 ring-white/10 ${t.type === 'error' ? 'bg-red-600' : t.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            <div className="text-sm leading-5">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
