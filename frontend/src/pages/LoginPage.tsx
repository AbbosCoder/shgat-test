import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, useAnimationControls } from 'motion/react'
import { ArrowRight, CircleAlert, Eye, EyeOff, Landmark, Layers, LoaderCircle, Lock, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/rol'

const FEATURES = [
  { icon: MapPin, text: 'Hujjat chegarasi xaritada chiziladi yoki GeoJSON fayldan yuklanadi' },
  { icon: ShieldCheck, text: 'Tekshiruvchi tasdiqlagach, hujjat ID raqam oladi' },
  { icon: Layers, text: 'Chegara ArcGIS qatlamiga yoziladi va undan ko\'rsatiladi' },
]

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }

export default function LoginPage() {
  const { user, login, chiqishSababi } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/arizalar'
  const [loginV, setLoginV] = useState('')
  const [parol, setParol] = useState('')
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const [busy, setBusy] = useState(false)
  const [xato, setXato] = useState<string | null>(null)
  const shake = useAnimationControls()

  if (user) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!loginV.trim() || !parol) {
      setXato('Login va parolni kiriting')
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } })
      return
    }
    setBusy(true)
    setXato(null)
    try {
      await login(loginV, parol)
      navigate(from, { replace: true })
    } catch (err) {
      setXato(err instanceof ApiError ? err.message : 'Kutilmagan xato')
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="hero-grid" aria-hidden="true" />
        <motion.div className="hero-blob b1" aria-hidden="true" animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="hero-blob b2" aria-hidden="true" animate={{ x: [0, -25, 0], y: [0, 25, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="hero-content" initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }}>
          <motion.div variants={fade} className="hero-brand">
            <span className="brand-mark"><Landmark size={20} /></span>
            <span>Geoaxborot tizimi</span>
          </motion.div>
          <motion.h1 variants={fade}>Shaharsozlik hujjatlari reestri</motion.h1>
          <motion.p variants={fade} className="hero-sub">Arizalarni qabul qilish, tekshirish va hujjat chegarasini ArcGIS'da ro'yxatga olish.</motion.p>
          <ul className="hero-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <motion.li key={text} variants={fade}><span><Icon size={16} /></span>{text}</motion.li>
            ))}
          </ul>
        </motion.div>
      </aside>

      <main className="login-main">
        <motion.form
          className="login-card"
          onSubmit={submit}
          noValidate
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}
        >
          <motion.div animate={shake}>
            <h2>Tizimga kirish</h2>
            <p className="muted">Hisobingiz ma'lumotlarini kiriting</p>

            {(xato || chiqishSababi) && (
              <motion.p className={`alert ${xato ? 'alert-error' : 'alert-warn'}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <CircleAlert size={18} />{xato ?? chiqishSababi}
              </motion.p>
            )}

            <div className="field">
              <label className="label" htmlFor="login">Login</label>
              <div className="input-icon">
                <UserRound size={17} />
                <input id="login" autoComplete="username" autoFocus value={loginV} onChange={(e) => setLoginV(e.target.value)} placeholder="Loginingiz" />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="parol">Parol</label>
              <div className="input-icon">
                <Lock size={17} />
                <input
                  id="parol"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={parol}
                  onChange={(e) => setParol(e.target.value)}
                  onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
                  placeholder="Parolingiz"
                />
                <button type="button" className="eye" aria-label={show ? 'Parolni yashirish' : 'Parolni ko\'rsatish'} onClick={() => setShow((s) => !s)}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {caps && <p className="small" style={{ color: 'var(--warn)' }}>Caps Lock yoqilgan</p>}
            </div>

            <motion.button type="submit" className="btn btn-primary btn-block" disabled={busy} whileTap={{ scale: 0.98 }}>
              {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}
              {busy ? 'Tekshirilmoqda' : 'Kirish'}
            </motion.button>
          </motion.div>
          <p className="login-foot small muted">Kirish huquqi faqat ruxsat berilgan xodimlar uchun.</p>
        </motion.form>
      </main>
    </div>
  )
}
