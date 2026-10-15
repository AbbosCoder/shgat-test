import { createContext, useContext, useState, type ReactNode } from 'react'
import { setApiRol } from './api'
import type { Rol } from './types'

const KEY = 'shgat.rol'

function initialRol(): Rol {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'ariza_beruvchi' || v === 'tekshiruvchi') return v
  } catch {
    /* localStorage yopiq bo'lishi mumkin */
  }
  return 'ariza_beruvchi'
}

const RolContext = createContext<{ rol: Rol; setRol: (r: Rol) => void }>({ rol: 'ariza_beruvchi', setRol: () => {} })

export function RolProvider({ children }: { children: ReactNode }) {
  const [rol, setRolState] = useState<Rol>(() => {
    const r = initialRol()
    setApiRol(r)
    return r
  })
  const setRol = (r: Rol) => {
    setApiRol(r)
    setRolState(r)
    try {
      localStorage.setItem(KEY, r)
    } catch {
      /* e'tiborsiz */
    }
  }
  return <RolContext.Provider value={{ rol, setRol }}>{children}</RolContext.Provider>
}

export const useRol = () => useContext(RolContext)
