import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CircleCheck, Clock, Files, Inbox, Plus, Undo2 } from 'lucide-react'
import HolatBadge from '../components/HolatBadge'
import { api } from '../lib/api'
import { HOLATLAR, HUJJAT_TURLARI, PAGE_SIZE } from '../lib/constants'
import type { ArizaQisqa, Holat } from '../lib/types'
import { useRol } from '../lib/rol'

const STATS: { key: '' | Holat; label: string; icon: typeof Files }[] = [
  { key: '', label: 'Jami arizalar', icon: Files },
  { key: 'yuborilgan', label: 'Tekshiruvda', icon: Clock },
  { key: 'hisobga_olingan', label: 'Hisobga olingan', icon: CircleCheck },
  { key: 'qaytarilgan', label: 'Qaytarilgan', icon: Undo2 },
]

/** Ro'yxat: filtrlar va sahifa URL'da saqlanadi (?holat=...&hujjat_turi=...&sahifa=2). */
export default function ArizalarPage() {
  const [params, setParams] = useSearchParams()
  const { rol } = useRol()
  const navigate = useNavigate()
  const holat = params.get('holat') ?? ''
  const turi = params.get('hujjat_turi') ?? ''
  const sahifa = Math.max(1, Number(params.get('sahifa') ?? 1) || 1)

  const [data, setData] = useState<{ items: ArizaQisqa[]; jami: number } | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [xato, setXato] = useState<string | null>(null)

  useEffect(() => {
    setXato(null)
    setData(null)
    api
      .royxat({ holat, hujjat_turi: turi, sahifa, hajm: PAGE_SIZE })
      .then(setData)
      .catch((e) => setXato(e.message))
  }, [holat, turi, sahifa, rol])

  // Statistika kartochkalari: har bir holat bo'yicha jami (hajm=1 — faqat son kerak)
  useEffect(() => {
    Promise.all(STATS.map((s) => api.royxat({ holat: s.key, hujjat_turi: turi, hajm: 1 }).then((r) => [s.key, r.jami] as const)))
      .then((pairs) => setStats(Object.fromEntries(pairs)))
      .catch(() => {})
  }, [turi, rol])

  const update = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k)
    if (!('sahifa' in patch)) p.delete('sahifa')
    setParams(p)
  }
  const sahifalar = data ? Math.max(1, Math.ceil(data.jami / PAGE_SIZE)) : 1

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Arizalar</h1>
          <p className="sub">
            {rol === 'tekshiruvchi'
              ? 'Tekshiruvdagi arizalarni ko\'rib chiqing: tasdiqlang yoki sabab bilan qaytaring.'
              : 'Shaharsozlik hujjatlari bo\'yicha yuborilgan arizalaringiz.'}
          </p>
        </div>
        {rol === 'ariza_beruvchi' && (
          <Link to="/arizalar/yangi" className="btn btn-primary"><Plus size={16} />Yangi ariza</Link>
        )}
      </div>

      <div className="stats">
        {STATS.map(({ key, label, icon: Icon }) => (
          <button key={key || 'all'} className={`stat tone-${key || 'all'} ${holat === key ? 'on' : ''}`} onClick={() => update({ holat: key })}>
            <span className="s-icon"><Icon size={20} /></span>
            <span>
              <div className="s-num">{stats[key] ?? '–'}</div>
              <div className="s-label">{label}</div>
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <select aria-label="Holat" value={holat} onChange={(e) => update({ holat: e.target.value })}>
            <option value="">Barcha holatlar</option>
            {Object.entries(HOLATLAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select aria-label="Hujjat turi" value={turi} onChange={(e) => update({ hujjat_turi: e.target.value })}>
            <option value="">Barcha turlar</option>
            {HUJJAT_TURLARI.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {(holat || turi) && <button className="btn btn-ghost" onClick={() => setParams({})}>Filtrni tozalash</button>}
          {data && <span className="count">{data.jami} ta ariza</span>}
        </div>

        {xato && <div className="card-pad"><p className="alert alert-error">{xato}</p></div>}

        {!data && !xato && (
          <div className="card-pad stack">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" />)}
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="empty">
            <span className="e-icon"><Inbox size={26} /></span>
            <h2>Ariza topilmadi</h2>
            <p>{holat || turi ? 'Tanlangan filtr bo\'yicha ariza yo\'q.' : 'Hali birorta ariza yuborilmagan.'}</p>
            {rol === 'ariza_beruvchi' && !holat && !turi && (
              <Link to="/arizalar/yangi" className="btn btn-primary"><Plus size={16} />Birinchi arizani yuborish</Link>
            )}
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID raqam</th>
                  <th>Hujjat</th>
                  <th>Turi</th>
                  <th>Hudud</th>
                  <th>Holat</th>
                  <th>Yuborilgan</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/arizalar/${a.id}`)}>
                    <td className="nowrap mono">
                      <Link to={`/arizalar/${a.id}`} onClick={(e) => e.stopPropagation()}>{a.id_raqam ?? `#${a.id}`}</Link>
                    </td>
                    <td>
                      <div className="cell-title">{a.hujjat_nomi}</div>
                      <div className="cell-sub">Tasdiqlangan: {a.tasdiq_sanasi}</div>
                    </td>
                    <td><span className="tur-chip">{a.hujjat_turi}</span></td>
                    <td>{a.soato_nomi ?? a.soato_kodi}</td>
                    <td><HolatBadge holat={a.holat} /></td>
                    <td className="nowrap muted">{new Date(a.yaratilgan).toLocaleDateString('uz-UZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && sahifalar > 1 && (
          <div className="pager">
            <span>{sahifa}-sahifa, jami {sahifalar}</span>
            <div className="actions" style={{ marginTop: 0 }}>
              <button className="btn btn-light" disabled={sahifa <= 1} onClick={() => update({ sahifa: String(sahifa - 1) })}>
                <ChevronLeft size={16} />Oldingi
              </button>
              <button className="btn btn-light" disabled={sahifa >= sahifalar} onClick={() => update({ sahifa: String(sahifa + 1) })}>
                Keyingi<ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
