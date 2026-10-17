import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { subscribePending } from '../lib/api'

/** Sahifa tepasidagi ingichka yuklanish chizig'i: istalgan API so'rovi davom etayotganda ko'rinadi. */
export default function TopLoader() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const unsub = subscribePending((n) => {
      clearTimeout(t)
      // Juda tez so'rovlarda miltillamasin: 150 ms dan uzoq davom etsagina ko'rsatamiz
      if (n > 0) t = setTimeout(() => setActive(true), 150)
      else setActive(false)
    })
    return () => {
      clearTimeout(t)
      unsub()
    }
  }, [])
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="top-loader"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 2.5, ease: [0.1, 0.7, 0.3, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.35 } }}
        />
      )}
    </AnimatePresence>
  )
}
