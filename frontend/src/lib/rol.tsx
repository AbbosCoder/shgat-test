import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setApiToken, setOnUnauthorized } from './api'
import type { Foydalanuvchi, Rol } from './types'

const KEY = 'shgat.session'

interface Session {
  token: string
  muddat: string
  foydalanuvchi: Foydalanuvchi
}

function loadSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null
    if (s && new Date(s.muddat).getTime() > Date.now()) return s
  } catch {
    /* localStorage yopiq yoki buzilgan — sessiyasiz boshlaymiz */
  }
  return null
}

interface AuthValue {
  user: Foydalanuvchi | null
  rol: Rol
  login: (login: string, parol: string) => Promise<void>
  logout: (sabab?: string) => void
  /** Sessiya tugagani sababli chiqarilganda login sahifasida ko'rsatiladi */
  chiqishSababi: string | null
}

const AuthContext = createContext<AuthValue>(null!)

/** JWT sessiya: token localStorage'da, muddati tugasa yoki server 401 qaytarsa — avtomatik chiqish. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const s = loadSession()
    setApiToken(s?.token ?? null)
    return s
  })
  const [chiqishSababi, setChiqishSababi] = useState<string | null>(null)

  const logout = useCallback((sabab?: string) => {
    setApiToken(null)
    setSession(null)
    setChiqishSababi(sabab ?? null)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* e'tiborsiz */
    }
  }, [])

  const login = useCallback(async (login: string, parol: string) => {
    const s = await api.login(login, parol)
    setApiToken(s.token)
    setSession(s)
    setChiqishSababi(null)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* e'tiborsiz */
    }
  }, [])

  useEffect(() => {
    setOnUnauthorized(() => logout('Sessiya muddati tugadi, qayta kiring.'))
  }, [logout])

  // Token muddati tugaydigan paytda o'zi chiqib ketadi
  useEffect(() => {
    if (!session) return
    const ms = new Date(session.muddat).getTime() - Date.now()
    const t = setTimeout(() => logout('Sessiya muddati tugadi, qayta kiring.'), Math.max(0, ms))
    return () => clearTimeout(t)
  }, [session, logout])

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.foydalanuvchi ?? null,
      rol: session?.foydalanuvchi.rol ?? 'ariza_beruvchi',
      login,
      logout,
      chiqishSababi,
    }),
    [session, login, logout, chiqishSababi],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
/** Sahifalar uchun qisqa yo'l: joriy foydalanuvchi roli */
export const useRol = () => useContext(AuthContext)
