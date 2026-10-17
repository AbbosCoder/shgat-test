import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChevronDown, ClipboardCheck, Files, Landmark, LogOut, Plus, UserRound } from 'lucide-react'
import ArizaFormPage from './pages/ArizaFormPage'
import ArizaPage from './pages/ArizaPage'
import ArizalarPage from './pages/ArizalarPage'
import LoginPage from './pages/LoginPage'
import { ConfirmProvider } from './components/ConfirmDialog'
import { ToastProvider } from './components/Toast'
import TopLoader from './components/TopLoader'
import { AuthProvider, useAuth } from './lib/rol'

const ROL_NOMI = { ariza_beruvchi: 'Ariza beruvchi', tekshiruvchi: 'Tekshiruvchi' } as const

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  if (!user) return null
  const Icon = user.rol === 'tekshiruvchi' ? ClipboardCheck : UserRound
  return (
    <div className="user-menu" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="avatar">{user.ism.slice(0, 1).toUpperCase()}</span>
        <span className="user-text">
          <span className="user-name">{user.ism}</span>
          <span className="user-rol"><Icon size={12} />{ROL_NOMI[user.rol]}</span>
        </span>
        <ChevronDown size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="dd-head">
              <div className="user-name">{user.ism}</div>
              <div className="small muted">@{user.login} · {ROL_NOMI[user.rol]}</div>
            </div>
            <button className="dd-item" onClick={() => logout()}><LogOut size={15} />Chiqish</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Header() {
  const { rol } = useAuth()
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/arizalar" className="brand">
          <span className="brand-mark"><Landmark size={18} /></span>
          <span>
            <div className="brand-title">Shaharsozlik hujjatlari reestri</div>
            <div className="brand-sub">Geoaxborot tizimi</div>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/arizalar" end><Files size={16} />Arizalar</NavLink>
          {rol === 'ariza_beruvchi' && <NavLink to="/arizalar/yangi"><Plus size={16} />Yangi ariza</NavLink>}
        </nav>
        <UserMenu />
      </div>
    </header>
  )
}

/** Har bir sahifa silliq paydo bo'ladi */
function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

function Protected() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <>
      <Header />
      <main className="container">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/arizalar" replace />} />
            <Route path="/arizalar" element={<Page><ArizalarPage /></Page>} />
            <Route path="/arizalar/yangi" element={<Page><ArizaFormPage key="yangi" /></Page>} />
            <Route path="/arizalar/:id" element={<Page><ArizaPage /></Page>} />
            <Route path="/arizalar/:id/tahrir" element={<Page><ArizaFormPage key="tahrir" /></Page>} />
            <Route path="*" element={<Page><p className="muted">Sahifa topilmadi. <Link to="/arizalar">Arizalarga</Link></p></Page>} />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <TopLoader />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={<Protected />} />
              </Routes>
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  )
}
