import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import HolatBadge from '../components/HolatBadge'
import { api } from '../lib/api'
import { HOLATLAR, HUJJAT_TURLARI, PAGE_SIZE } from '../lib/constants'
import type { ArizaQisqa } from '../lib/types'
import { useRol } from '../lib/rol'

/** Ro'yxat: filtrlar va sahifa URL'da saqlanadi (?holat=...&hujjat_turi=...&sahifa=2). */
export default function ArizalarPage() {
  const [params, setParams] = useSearchParams()
  const { rol } = useRol()
  const location = useLocation()
  const holat = params.get('holat') ?? ''
  const turi = params.get('hujjat_turi') ?? ''
  const sahifa = Math.max(1, Number(params.get('sahifa') ?? 1) || 1)

  const [data, setData] = useState<{ items: ArizaQisqa[]; jami: number } | null>(null)
  const [xato, setXato] = useState<string | null>(null)

  useEffect(() => {
    setXato(null)
    api
      .royxat({ holat, hujjat_turi: turi, sahifa, hajm: PAGE_SIZE })
      .then(setData)
      .catch((e) => setXato(e.message))
  }, [holat, turi, sahifa, rol, location.key])

  const setFiltr = (key: string, value: string) => {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('sahifa')
    setParams(p)
  }
  const setSahifa = (n: number) => {
    const p = new URLSearchParams(params)
    p.set('sahifa', String(n))
    setParams(p)
  }
  const sahifalar = data ? Math.max(1, Math.ceil(data.jami / PAGE_SIZE)) : 1

  return (
    <div className="card">
      <div className="page-head">
        <h1>Arizalar</h1>
        {rol === 'ariza_beruvchi' && <Link to="/arizalar/yangi" className="btn btn-primary">+ Yangi ariza</Link>}
      </div>

      <div className="filters">
        <label>
          Holat
          <select value={holat} onChange={(e) => setFiltr('holat', e.target.value)}>
            <option value="">Barchasi</option>
            {Object.entries(HOLATLAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Hujjat turi
          <select value={turi} onChange={(e) => setFiltr('hujjat_turi', e.target.value)}>
            <option value="">Barchasi</option>
            {HUJJAT_TURLARI.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        {data && <span className="muted">Jami: {data.jami}</span>}
      </div>

      {xato && <p className="alert alert-error">{xato}</p>}
      {!data && !xato && <p className="muted">Yuklanmoqda…</p>}
      {data && data.items.length === 0 && <p className="muted empty">Ariza topilmadi.</p>}

      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nomi</th>
                <th>Turi</th>
                <th>Hudud</th>
                <th>Holat</th>
                <th>Yuborilgan</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">
                    <Link to={`/arizalar/${a.id}`}>{a.id_raqam ?? `#${a.id}`}</Link>
                  </td>
                  <td><Link to={`/arizalar/${a.id}`}>{a.hujjat_nomi}</Link></td>
                  <td>{a.hujjat_turi}</td>
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
          <button className="btn btn-light" disabled={sahifa <= 1} onClick={() => setSahifa(sahifa - 1)}>← Oldingi</button>
          <span>{sahifa} / {sahifalar}</span>
          <button className="btn btn-light" disabled={sahifa >= sahifalar} onClick={() => setSahifa(sahifa + 1)}>Keyingi →</button>
        </div>
      )}
    </div>
  )
}
