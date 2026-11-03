import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Tone = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  tone: Tone
}

interface ToastContextValue {
  toast: (message: string, tone?: Tone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback((message: string, tone: Tone = 'default') => {
    const id = ++seq.current
    setItems((prev) => [...prev.slice(-2), { id, message, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id))
    }, 3600)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="toast-in pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-line bg-ink-800/95 px-4 py-3 text-sm text-cream shadow-lift backdrop-blur-md"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background:
                  item.tone === 'error' ? '#FFFFFF' : item.tone === 'success' ? '#8FB8E8' : '#FFFFFF',
              }}
            />
            <span className="leading-snug">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
