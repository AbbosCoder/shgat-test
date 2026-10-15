import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ChegaraMap from '../components/ChegaraMap'
import HolatBadge from '../components/HolatBadge'
import { api, tushunarliXato } from '../lib/api'
import { FAYL_TURLARI } from '../lib/constants'
import type { ArizaToliq } from '../lib/types'
import { useRol } from '../lib/rol'

export default function ArizaPage() {
  const { id } = useParams()
  const { rol } = useRol()
  const location = useLocation()
  const [a, setA] = useState<ArizaToliq | null>(null)
  const [xato, setXato] = useState<string | null>(null)
  const [amalXato, setAmalXato] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>((location.state as any)?.flash ?? null)
  const [busy, setBusy] = useState(false)
  const [qaytarishOchiq, setQaytarishOchiq] = useState(false)
  const [sabab, setSabab] = useState('')
  const [sababXato, setSababXato] = useState<string | null>(null)

  const load = useCallback(() => {
    api.ariza(id!).then(setA).catch((e) => setXato(tushunarliXato(e)))
  }, [id])
  useEffect(load, [load])

  if (xato) return <p className="alert alert-error">{xato}</p>
  if (!a) return <p className="muted">Yuklanmoqda…</p>

  const tasdiqlash = async () => {
    if (!confirm('Arizani tasdiqlaysizmi? ID beriladi va chegara ArcGIS qatlamiga yoziladi.')) return
    setBusy(true)
    setAmalXato(null)
    try {
      const r = await api.tasdiqlash(a.id)
      setFlash(`Tasdiqlandi: ${r.id_raqam}, ArcGIS objectId ${r.arcgis_object_id}`)
      load()
    } catch (e) {
      setAmalXato(tushunarliXato(e))
    } finally {
      setBusy(false)
    }
  }

  const qaytarish = async () => {
    if (!sabab.trim()) {
      setSababXato('Qaytarish sababini yozing')
      return
    }
    setBusy(true)
    setAmalXato(null)
    try {
      setA(await api.qaytarish(a.id, sabab.trim()))
      setFlash('Ariza qaytarildi')
      setQaytarishOchiq(false)
      setSabab('')
    } catch (e) {
      setAmalXato(tushunarliXato(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <p><Link to="/arizalar">← Arizalar</Link></p>
      <div className="page-head">
        <h1>{a.id_raqam ?? `Ariza #${a.id}`}</h1>
        <HolatBadge holat={a.holat} />
      </div>
      {flash && <p className="alert alert-ok">{flash}</p>}

      {a.holat === 'qaytarilgan' && (
        <div className="alert alert-warn">
          <b>Qaytarish sababi:</b> {a.qaytarish_sababi}
          {rol === 'ariza_beruvchi' && (
            <div><Link to={`/arizalar/${a.id}/tahrir`} className="btn btn-primary mt">Tuzatib qayta yuborish</Link></div>
          )}
        </div>
      )}

      <dl className="details">
        <dt>Hujjat nomi</dt><dd>{a.hujjat_nomi}</dd>
        <dt>Turi</dt><dd>{a.hujjat_turi}</dd>
        <dt>Hudud</dt><dd>{a.soato_kodi} — {a.soato_nomi}</dd>
        <dt>Tasdiqlangan sana</dt><dd>{a.tasdiq_sanasi}</dd>
        <dt>Qaror raqami</dt><dd>{a.tasdiq_hujjati}</dd>
        <dt>ID raqam</dt><dd>{a.id_raqam ?? <span className="muted">tasdiqlangandan keyin beriladi</span>}</dd>
        {a.arcgis_object_id != null && (<><dt>ArcGIS objectId</dt><dd>{a.arcgis_object_id}</dd></>)}
      </dl>

      <h2>Fayllar</h2>
      <ul className="files">
        {a.fayllar.map((f) => (
          <li key={f.tur}>
            <span className="muted">{FAYL_TURLARI[f.tur]}:</span>{' '}
            <a href={f.url} target="_blank" rel="noreferrer">{f.nomi}</a>{' '}
            <span className="muted small">({(f.hajm / 1024).toFixed(0)} KB)</span>
          </li>
        ))}
      </ul>

      <h2>Chegara</h2>
      <ChegaraMap chegara={a.chegara} objectId={a.holat === 'hisobga_olingan' ? a.arcgis_object_id : null} />

      {rol === 'tekshiruvchi' && a.holat === 'yuborilgan' && (
        <div className="review">
          <h2>Tekshiruvchi qarori</h2>
          {amalXato && <p className="alert alert-error">{amalXato}</p>}
          {!qaytarishOchiq ? (
            <div className="actions">
              <button className="btn btn-danger-light" disabled={busy} onClick={() => setQaytarishOchiq(true)}>Qaytarish</button>
              <button className="btn btn-primary" disabled={busy} onClick={tasdiqlash}>{busy ? 'Bajarilmoqda…' : 'Tasdiqlash'}</button>
            </div>
          ) : (
            <div className="field">
              <label className="label" htmlFor="sabab">Qaytarish sababi (majburiy)</label>
              <textarea id="sabab" rows={3} value={sabab} onChange={(e) => { setSabab(e.target.value); setSababXato(null) }} />
              {sababXato && <p className="field-error">{sababXato}</p>}
              <div className="actions">
                <button className="btn btn-light" onClick={() => setQaytarishOchiq(false)}>Bekor qilish</button>
                <button className="btn btn-danger" disabled={busy} onClick={qaytarish}>Qaytarish</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
