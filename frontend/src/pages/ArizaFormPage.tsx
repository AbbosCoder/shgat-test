import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CircleAlert, Hash, LoaderCircle, Send, TriangleAlert } from 'lucide-react'
import ChegaraEditor from '../components/ChegaraEditor'
import FileInput from '../components/FileInput'
import { useToast } from '../components/Toast'
import { api, ApiError } from '../lib/api'
import { FAYL_TAVSIF, FAYL_TURLARI, HUJJAT_TURLARI } from '../lib/constants'
import { bolajakId } from '../lib/geo'
import { arizaSchema, type ArizaForm } from '../lib/schema'
import type { ArizaToliq, FaylTur, Soato } from '../lib/types'
import { useRol } from '../lib/rol'

const EMPTY: ArizaForm = {
  hujjat_nomi: '',
  hujjat_turi: '' as any,
  soato_kodi: '',
  tasdiq_sanasi: '',
  tasdiq_hujjati: '',
  chegara: null,
  asosiy_chizma: null,
  tushuntirish_xati: null,
  tasdiqlovchi_hujjat: null,
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="field-error"><CircleAlert size={14} />{msg}</p> : null
}

/** Yangi ariza (/arizalar/yangi) yoki qaytarilgan arizani tuzatish (/arizalar/:id/tahrir). */
export default function ArizaFormPage() {
  const { id } = useParams()
  const tahrir = id != null
  const navigate = useNavigate()
  const toast = useToast()
  const { rol } = useRol()
  const [soatolar, setSoatolar] = useState<Soato[]>([])
  const [mavjud, setMavjud] = useState<ArizaToliq | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [umumiyXato, setUmumiyXato] = useState<string | null>(null)

  const schema = useMemo(() => arizaSchema(!tahrir), [tahrir])
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ArizaForm>({ resolver: zodResolver(schema), defaultValues: EMPTY, mode: 'onTouched' })

  useEffect(() => {
    api.soato().then(setSoatolar).catch(() => setUmumiyXato('SOATO ro\'yxatini yuklab bo\'lmadi'))
  }, [])

  useEffect(() => {
    if (!tahrir) return
    api
      .ariza(id!)
      .then((a) => {
        setMavjud(a)
        reset({ ...EMPTY, ...pick(a) })
      })
      .catch((e) => setUmumiyXato(e.message))
  }, [id, tahrir, reset])

  const [turi, soato, sana] = watch(['hujjat_turi', 'soato_kodi', 'tasdiq_sanasi'])
  const kelajakId = bolajakId(turi, soato, sana)
  const xatoSoni = Object.keys(errors).length

  if (rol !== 'ariza_beruvchi') {
    return (
      <p className="alert alert-warn">
        <TriangleAlert size={18} />
        <span>
          Ariza yuborish faqat ariza beruvchi hisobi uchun. Siz tekshiruvchi sifatida kirgansiz.{' '}
          <Link to={tahrir ? `/arizalar/${id}` : '/arizalar'}>{tahrir ? 'Arizani ko\'rish' : 'Arizalar ro\'yxati'}</Link>
        </span>
      </p>
    )
  }
  if (tahrir && mavjud && mavjud.holat !== 'qaytarilgan') {
    return <p className="alert alert-warn"><TriangleAlert size={18} />Faqat qaytarilgan arizani tuzatish mumkin.&nbsp;<Link to={`/arizalar/${id}`}>Arizaga qaytish</Link></p>
  }

  const onSubmit = async (v: ArizaForm) => {
    setUmumiyXato(null)
    setProgress(0)
    const data = {
      hujjat_nomi: v.hujjat_nomi.trim(),
      hujjat_turi: v.hujjat_turi,
      soato_kodi: v.soato_kodi,
      tasdiq_sanasi: v.tasdiq_sanasi,
      tasdiq_hujjati: v.tasdiq_hujjati.trim(),
      chegara: v.chegara!,
    }
    const files: Partial<Record<FaylTur, File>> = {}
    for (const t of Object.keys(FAYL_TURLARI) as FaylTur[]) if (v[t]) files[t] = v[t] as File
    try {
      const res = tahrir ? await api.qaytaYuborish(Number(id), data, files, setProgress) : await api.yuborish(data, files, setProgress)
      toast(tahrir ? 'Ariza qayta yuborildi' : 'Ariza yuborildi — tekshiruvchi ko\'rib chiqadi')
      navigate(`/arizalar/${res.id}`)
    } catch (e) {
      setProgress(null)
      if (e instanceof ApiError) {
        setUmumiyXato(e.message)
        for (const [k, msg] of Object.entries(e.maydonlar)) setError(k as keyof ArizaForm, { message: msg })
      } else setUmumiyXato('Kutilmagan xato')
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <Link to={tahrir ? `/arizalar/${id}` : '/arizalar'} className="back"><ArrowLeft size={15} />Orqaga</Link>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <h1>{tahrir ? `Arizani tuzatish #${id}` : 'Yangi ariza'}</h1>
            <p className="sub">Shaharsozlik hujjatini ro'yxatga olish uchun ariza. Barcha maydonlar majburiy.</p>
          </div>
        </div>
      </div>

      {mavjud?.qaytarish_sababi && (
        <p className="alert alert-warn"><TriangleAlert size={18} /><span><b>Tekshiruvchi izohi:</b> {mavjud.qaytarish_sababi}</span></p>
      )}

      <section className="card">
        <div className="card-head"><span className="step">1</span><h2>Hujjat ma'lumotlari</h2></div>
        <div className="card-pad grid-2">
          <div className={`field span-2 ${errors.hujjat_nomi ? 'has-error' : ''}`}>
            <label className="label" htmlFor="hujjat_nomi">Hujjat nomi</label>
            <input id="hujjat_nomi" maxLength={255} placeholder="Masalan: Andijon shahri bosh rejasi" {...register('hujjat_nomi')} />
            <Err msg={errors.hujjat_nomi?.message} />
          </div>

          <div className={`field ${errors.hujjat_turi ? 'has-error' : ''}`}>
            <label className="label" htmlFor="hujjat_turi">Hujjat turi</label>
            <select id="hujjat_turi" {...register('hujjat_turi')}>
              <option value="">Tanlang</option>
              {HUJJAT_TURLARI.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Err msg={errors.hujjat_turi?.message} />
          </div>

          <div className={`field ${errors.soato_kodi ? 'has-error' : ''}`}>
            <label className="label" htmlFor="soato_kodi">Hudud (SOATO)</label>
            <select id="soato_kodi" {...register('soato_kodi')}>
              <option value="">Tanlang</option>
              {soatolar.map((s) => (
                <option key={s.kod} value={s.kod}>{s.nomi} · {s.kod}</option>
              ))}
            </select>
            <Err msg={errors.soato_kodi?.message} />
          </div>

          <div className={`field ${errors.tasdiq_sanasi ? 'has-error' : ''}`}>
            <label className="label" htmlFor="tasdiq_sanasi">Tasdiqlangan sana</label>
            <input id="tasdiq_sanasi" type="date" max={new Date().toISOString().slice(0, 10)} {...register('tasdiq_sanasi')} />
            <Err msg={errors.tasdiq_sanasi?.message} />
          </div>

          <div className={`field ${errors.tasdiq_hujjati ? 'has-error' : ''}`}>
            <label className="label" htmlFor="tasdiq_hujjati">Qaror raqami</label>
            <input id="tasdiq_hujjati" maxLength={100} placeholder="Masalan: 123-son qaror" {...register('tasdiq_hujjati')} />
            <Err msg={errors.tasdiq_hujjati?.message} />
          </div>

          <div className="field span-2">
            <span className="label">Bo'lajak ID raqam</span>
            <div className="id-preview">
              <Hash size={18} className="muted" />
              <input id="kelajak_id" type="hidden" readOnly value={kelajakId ?? ''} />
              <span className={`idp-val ${kelajakId ? '' : 'empty'}`}>{kelajakId ?? 'Tur, hudud va sana tanlanganda ko\'rinadi'}</span>
              <span className="small muted" style={{ marginLeft: 'auto' }}>tekshiruvchi tasdiqlaganda beriladi</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <span className="step">2</span><h2>Hujjat chegarasi</h2>
          <span className="hint">O'zbekiston hududida bo'lishi kerak · <a href="/namuna/andijon_chegara.geojson" download>namuna GeoJSON</a></span>
        </div>
        <div className="card-pad">
          <Controller
            control={control}
            name="chegara"
            render={({ field, fieldState }) => (
              <ChegaraEditor value={field.value ?? null} onChange={(g) => { field.onChange(g); field.onBlur() }} error={fieldState.error?.message} />
            )}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <span className="step">3</span><h2>Fayllar</h2>
          <span className="hint">
            {tahrir ? 'Faqat almashtiriladigan faylni tanlang' : '3 ta fayl majburiy'} ·{' '}
            <a href="/namuna/namuna-fayllar.zip" download>namuna fayllar</a>
          </span>
        </div>
        <div className="card-pad grid-3">
          {(Object.keys(FAYL_TURLARI) as FaylTur[]).map((t) => (
            <Controller
              key={t}
              control={control}
              name={t}
              render={({ field }) => (
                <FileInput
                  label={FAYL_TURLARI[t]}
                  hint={FAYL_TAVSIF[t]}
                  value={field.value as File | null}
                  onChange={(f) => { field.onChange(f); field.onBlur() }}
                  error={errors[t]?.message as string | undefined}
                  mavjud={mavjud?.fayllar.find((f) => f.tur === t)?.nomi}
                />
              )}
            />
          ))}
        </div>
      </section>

      {umumiyXato && <p className="alert alert-error"><CircleAlert size={18} />{umumiyXato}</p>}

      <div className="action-bar">
        <div className="grow">
          {progress != null ? (
            <>
              <div className="small" style={{ marginBottom: 6 }}>{progress < 100 ? `Fayllar yuklanmoqda: ${progress}%` : 'Server tekshirmoqda…'}</div>
              <div className="progress" aria-label="Yuklash jarayoni"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
            </>
          ) : submitCount > 0 && xatoSoni > 0 ? (
            <span className="field-error"><CircleAlert size={14} />{xatoSoni} ta maydonni to'g'rilang</span>
          ) : (
            <span className="small muted">Yuborilgandan keyin ariza "Tekshiruvda" holatiga o'tadi</span>
          )}
        </div>
        <Link to={tahrir ? `/arizalar/${id}` : '/arizalar'} className="btn btn-light">Bekor qilish</Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
          {isSubmitting ? 'Yuborilmoqda' : tahrir ? 'Qayta yuborish' : 'Yuborish'}
        </button>
      </div>
    </form>
  )
}

function pick(a: ArizaToliq): Partial<ArizaForm> {
  return {
    hujjat_nomi: a.hujjat_nomi,
    hujjat_turi: a.hujjat_turi as any,
    soato_kodi: a.soato_kodi,
    tasdiq_sanasi: a.tasdiq_sanasi,
    tasdiq_hujjati: a.tasdiq_hujjati,
    chegara: a.chegara,
  }
}
