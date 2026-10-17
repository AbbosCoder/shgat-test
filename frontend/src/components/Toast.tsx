import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck } from 'lucide-react'

type Tone = 'ok' | 'error'
interface Item { id: number; text: string; tone: Tone }

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const show = useCallback((text: string, tone: Tone = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, text, tone }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast ${t.tone}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {t.tone === 'ok' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
