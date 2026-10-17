import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleHelp } from 'lucide-react'

interface Options {
  title: string
  text?: string
  confirmText?: string
  tone?: 'primary' | 'success' | 'danger'
}

const ConfirmContext = createContext<(o: Options) => Promise<boolean>>(async () => false)

/** window.confirm o'rniga: dizaynga mos, animatsiyali tasdiqlash oynasi. `await confirm({...})` → true/false */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})
  const okRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((o: Options) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (v: boolean) => {
    resolver.current(v)
    setOpts(null)
  }

  useEffect(() => {
    if (!opts) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opts])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close(false)}>
            <motion.div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={`modal-icon tone-${opts.tone ?? 'primary'}`}><CircleHelp size={22} /></span>
              <h2 id="confirm-title">{opts.title}</h2>
              {opts.text && <p className="muted">{opts.text}</p>}
              <div className="actions">
                <button className="btn btn-light" onClick={() => close(false)}>Bekor qilish</button>
                <button ref={okRef} className={`btn btn-${opts.tone ?? 'primary'}`} onClick={() => close(true)}>
                  {opts.confirmText ?? 'Tasdiqlash'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
