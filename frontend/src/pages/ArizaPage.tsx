import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Check, CircleAlert, Download, FileText, Hash, Layers, LoaderCircle, MapPin, PenLine, ShieldCheck, TriangleAlert, Undo2,
} from 'lucide-react'
import ChegaraMap from '../components/ChegaraMap'
import HolatBadge from '../components/HolatBadge'
import StatusTimeline from '../components/StatusTimeline'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { api, tushunarliXato } from '../lib/api'
import { FAYL_TURLARI } from '../lib/constants'
import type { ArizaToliq } from '../lib/types'
import { useRol } from '../lib/rol'

export default function ArizaPage() {
  const { id } = useParams()
  const { rol } = useRol()
  const toast = useToast()
  const confirm = useConfirm()
  const [a, setA] = useState<ArizaToliq | null>(null)
  const [xato, setXato] = useState<string | null>(null)
  const [amalXato, setAmalXato] = useState<string | null>(null)
  const [busy, setBusy] = useState<'tasdiq' | 'qaytar' | null>(null)
  const [qaytarishOchiq, setQaytarishOchiq] = useState(false)
  const [sabab, setSabab] = useState('')
  const [sababXato, setSababXato] = useState<string | null>(null)

  const load = useCallback(() => {
    api.ariza(id!).then(setA).catch((e) => setXato(tushunarliXato(e)))
  }, [id])
  useEffect(load, [load])

  if (xato) return <p className="alert alert-error"><CircleAlert size={18} />{xato}</p>
  if (!a) return <div className="card card-pad stack">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" />)}</div>

  const tasdiqlash = async () => {
    const ok = await confirm({
      title: 'Arizani tasdiqlaysizmi?',
      text: `Hujjatga ${a.hujjat_turi}-${a.soato_kodi}-${a.tasdiq_sanasi.slice(0, 4)} raqami beriladi va chegara ArcGIS qatlamiga yoziladi. Bu amalni ortga qaytarib bo'lmaydi.`,
      confirmText: 'Ha, tasdiqlash',
      tone: 'success',
    })
    if (!ok) return
    setBusy('tasdiq')
    setAmalXato(null)
    try {
      const r = await api.tasdiqlash(a.id)
      toast(`Tasdiqlandi: ${r.id_raqam}`)
      load()
    } catch (e) {
      setAmalXato(tushunarliXato(e))
    } finally {
      setBusy(null)
    }
  }

  const qaytarish = async () => {
    if (!sabab.trim()) {
      setSababXato('Qaytarish sababini yozing')
      return
    }
    setBusy('qaytar')
    setAmalXato(null)
    try {
      setA(await api.qaytarish(a.id, sabab.trim()))
      toast('Ariza ariza beruvchiga qaytarildi')
      setQaytarishOchiq(false)
      setSabab('')
    } catch (e) {
      setAmalXato(tushunarliXato(e))
    } finally {
      setBusy(null)
    }
  }

  const tekshiruvchiPanel = rol === 'tekshiruvchi' && a.holat === 'yuborilgan'

  return (
    <div className="stack">
      <div>
        <Link to="/arizalar" className="back"><ArrowLeft size={15} />Arizalar</Link>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
              <h1 className={a.id_raqam ? 'mono' : ''}>{a.id_raqam ?? `Ariza #${a.id}`}</h1>
              <HolatBadge holat={a.holat} />
            </div>
            <p className="sub">{a.hujjat_nomi}</p>
          </div>
          {rol === 'ariza_beruvchi' && a.holat === 'qaytarilgan' && (
            <Link to={`/arizalar/${a.id}/tahrir`} className="btn btn-primary"><PenLine size={16} />Tuzatib qayta yuborish</Link>
          )}
        </div>
      </div>

      <div className="card"><StatusTimeline holat={a.holat} /></div>

      {a.holat === 'qaytarilgan' && (
        <p className="alert alert-warn"><TriangleAlert size={18} /><span><b>Qaytarish sababi:</b> {a.qaytarish_sababi}</span></p>
      )}

      {tekshiruvchiPanel && (
        <section className="card review">
          <div className="card-head">
            <ShieldCheck size={18} className="muted" /><h2>Tekshiruvchi qarori</h2>
            <span className="hint">Ma'lumotlar, fayllar va chegarani tekshiring</span>
          </div>
          <div className="card-pad stack">
            {amalXato && <p className="alert alert-error"><CircleAlert size={18} />{amalXato}</p>}
            {qaytarishOchiq ? (
              <div className={`field ${sababXato ? 'has-error' : ''}`}>
                <label className="label" htmlFor="sabab">Qaytarish sababi (majburiy)</label>
                <textarea id="sabab" placeholder="Masalan: chegara bosh reja hududiga mos emas" value={sabab} onChange={(e) => { setSabab(e.target.value); setSababXato(null) }} />
                {sababXato && <p className="field-error"><CircleAlert size={14} />{sababXato}</p>}
                <div className="actions">
                  <button className="btn btn-light" onClick={() => setQaytarishOchiq(false)}>Bekor qilish</button>
                  <button className="btn btn-danger" disabled={busy != null} onClick={qaytarish}>
                    {busy === 'qaytar' ? <LoaderCircle size={16} className="spin" /> : <Undo2 size={16} />}Qaytarish
                  </button>
                </div>
              </div>
            ) : (
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <button className="btn btn-success" disabled={busy != null} onClick={tasdiqlash}>
                  {busy === 'tasdiq' ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                  {busy === 'tasdiq' ? 'ArcGIS\'ga yozilmoqda' : 'Tasdiqlash'}
                </button>
                <button className="btn btn-danger-light" disabled={busy != null} onClick={() => setQaytarishOchiq(true)}>
                  <Undo2 size={16} />Qaytarish
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Hujjat ma'lumotlari</h2></div>
            <dl className="card-pad kv">
              <dt><FileText size={15} />Hujjat nomi</dt><dd>{a.hujjat_nomi}</dd>
              <dt><Layers size={15} />Turi</dt><dd><span className="tur-chip">{a.hujjat_turi}</span></dd>
              <dt><MapPin size={15} />Hudud</dt><dd>{a.soato_nomi} <span className="muted mono small">{a.soato_kodi}</span></dd>
              <dt><Calendar size={15} />Tasdiqlangan</dt><dd>{a.tasdiq_sanasi}</dd>
              <dt><FileText size={15} />Qaror raqami</dt><dd>{a.tasdiq_hujjati}</dd>
              <dt><Hash size={15} />ID raqam</dt>
              <dd>{a.id_raqam ? <span className="mono">{a.id_raqam}</span> : <span className="muted">tasdiqlangandan keyin beriladi</span>}</dd>
              {a.arcgis_object_id != null && (<><dt><Layers size={15} />ArcGIS objectId</dt><dd className="mono">{a.arcgis_object_id}</dd></>)}
            </dl>
          </section>

          <section className="card">
            <div className="card-head"><h2>Fayllar</h2><span className="hint">{a.fayllar.length} ta</span></div>
            <ul className="card-pad files">
              {a.fayllar.map((f) => (
                <li key={f.tur}>
                  <a href={f.url} target="_blank" rel="noreferrer">
                    <span className="f-icon"><FileText size={17} /></span>
                    <span className="f-body">
                      <div className="f-name">{f.nomi}</div>
                      <div className="small muted">{FAYL_TURLARI[f.tur]} · {(f.hajm / 1024).toFixed(0)} KB</div>
                    </span>
                    <Download size={16} className="muted" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <div className="card-head">
            <h2>Chegara</h2>
            <span className="hint">{a.holat === 'hisobga_olingan' ? 'ArcGIS qatlamidan' : 'Ariza ma\'lumotidan'}</span>
          </div>
          <div className="card-pad">
            <ChegaraMap chegara={a.chegara} objectId={a.holat === 'hisobga_olingan' ? a.arcgis_object_id : null} />
          </div>
        </section>
      </div>
    </div>
  )
}
