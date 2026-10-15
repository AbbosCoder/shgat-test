import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import ArizaFormPage from './pages/ArizaFormPage'
import ArizaPage from './pages/ArizaPage'
import ArizalarPage from './pages/ArizalarPage'
import { RolProvider, useRol } from './lib/rol'
import type { Rol } from './lib/types'

function Header() {
  const { rol, setRol } = useRol()
  return (
    <header className="topbar">
      <Link to="/arizalar" className="brand">Shaharsozlik hujjatlari reestri</Link>
      <nav>
        <Link to="/arizalar">Arizalar</Link>
        {rol === 'ariza_beruvchi' && <Link to="/arizalar/yangi">Yangi ariza</Link>}
      </nav>
      <label className="rol-switch" title="Topshiriqda rol soddalashtirilgan: X-Rol sarlavhasi">
        Rol:
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          <option value="ariza_beruvchi">Ariza beruvchi</option>
          <option value="tekshiruvchi">Tekshiruvchi</option>
        </select>
      </label>
    </header>
  )
}

export default function App() {
  return (
    <RolProvider>
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
    </RolProvider>
  )
}
