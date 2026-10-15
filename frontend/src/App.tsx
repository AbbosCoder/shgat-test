import { BrowserRouter, Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { ClipboardCheck, Files, Landmark, Plus, UserRound } from 'lucide-react'
import ArizaFormPage from './pages/ArizaFormPage'
import ArizaPage from './pages/ArizaPage'
import ArizalarPage from './pages/ArizalarPage'
import { ToastProvider } from './components/Toast'
import { RolProvider, useRol } from './lib/rol'

function Header() {
  const { rol, setRol } = useRol()
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
        {/* Topshiriqda rol soddalashtirilgan: tanlov X-Rol sarlavhasi sifatida yuboriladi */}
        <div className="segmented" role="group" aria-label="Rol">
          <button className={rol === 'ariza_beruvchi' ? 'on' : ''} onClick={() => setRol('ariza_beruvchi')}>
            <UserRound size={14} />Ariza beruvchi
          </button>
          <button className={rol === 'tekshiruvchi' ? 'on' : ''} onClick={() => setRol('tekshiruvchi')}>
            <ClipboardCheck size={14} />Tekshiruvchi
          </button>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <RolProvider>
      <ToastProvider>
        <BrowserRouter>
          <Header />
          <main className="container">
            <Routes>
              <Route path="/" element={<Navigate to="/arizalar" replace />} />
              <Route path="/arizalar" element={<ArizalarPage />} />
              <Route path="/arizalar/yangi" element={<ArizaFormPage key="yangi" />} />
              <Route path="/arizalar/:id" element={<ArizaPage />} />
              <Route path="/arizalar/:id/tahrir" element={<ArizaFormPage key="tahrir" />} />
              <Route path="*" element={<p className="muted">Sahifa topilmadi. <Link to="/arizalar">Arizalarga</Link></p>} />
            </Routes>
          </main>
        </BrowserRouter>
      </ToastProvider>
    </RolProvider>
  )
}
