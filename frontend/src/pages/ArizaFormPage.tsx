import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChegaraEditor from '../components/ChegaraEditor'
import FileInput from '../components/FileInput'
import { api, ApiError } from '../lib/api'
import { FAYL_TURLARI, HUJJAT_TURLARI } from '../lib/constants'
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

/** Yangi ariza (/arizalar/yangi) yoki qaytarilgan arizani tuzatish (/arizalar/:id/tahrir). */
export default function ArizaFormPage() {
  const { id } = useParams()
  const tahrir = id != null
  const navigate = useNavigate()
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
    formState: { errors, isSubmitting },
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

  if (rol !== 'ariza_beruvchi') {
    return <p className="alert alert-warn">Ariza yuborish uchun yuqorida "Ariza beruvchi" rolini tanlang.</p>
  }
  if (tahrir && mavjud && mavjud.holat !== 'qaytarilgan') {
    return <p className="alert alert-warn">Faqat qaytarilgan arizani tuzatish mumkin. <Link to={`/arizalar/${id}`}>Arizaga qaytish</Link></p>
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
      navigate(`/arizalar/${res.id}`, { state: { flash: tahrir ? 'Ariza qayta yuborildi' : 'Ariza yuborildi' } })
    } catch (e) {
      setProgress(null)
      if (e instanceof ApiError) {
        setUmumiyXato(e.message)
        for (const [k, msg] of Object.entries(e.maydonlar)) setError(k as keyof ArizaForm, { message: msg })
      } else setUmumiyXato('Kutilmagan xato')
    }
  }

  const fileErr = (t: FaylTur) => errors[t]?.message as string | undefined

  return (
    <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1>{tahrir ? `Arizani tuzatish #${id}` : 'Yangi ariza'}</h1>
      {mavjud?.qaytarish_sababi && (
        <p className="alert alert-warn">
          <b>Qaytarish sababi:</b> {mavjud.qaytarish_sababi}
        </p>
      )}

      <div className="grid-2">
        <div className={`field span-2 ${errors.hujjat_nomi ? 'has-error' : ''}`}>
          <label className="label" htmlFor="hujjat_nomi">Hujjat nomi</label>
          <input id="hujjat_nomi" maxLength={255} placeholder="Masalan: Andijon shahri bosh rejasi" {...register('hujjat_nomi')} />
          {errors.hujjat_nomi && <p className="field-error">{errors.hujjat_nomi.message}</p>}
        </div>

        <div className={`field ${errors.hujjat_turi ? 'has-error' : ''}`}>
          <label className="label" htmlFor="hujjat_turi">Hujjat turi</label>
          <select id="hujjat_turi" {...register('hujjat_turi')}>
            <option value="">— tanlang —</option>
            {HUJJAT_TURLARI.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.hujjat_turi && <p className="field-error">{errors.hujjat_turi.message}</p>}
        </div>

        <div className={`field ${errors.soato_kodi ? 'has-error' : ''}`}>
          <label className="label" htmlFor="soato_kodi">Hudud (SOATO)</label>
          <select id="soato_kodi" {...register('soato_kodi')}>
            <option value="">— tanlang —</option>
            {soatolar.map((s) => (
              <option key={s.kod} value={s.kod}>{s.kod} — {s.nomi}</option>
            ))}
          </select>
          {errors.soato_kodi && <p className="field-error">{errors.soato_kodi.message}</p>}
        </div>

        <div className={`field ${errors.tasdiq_sanasi ? 'has-error' : ''}`}>
          <label className="label" htmlFor="tasdiq_sanasi">Tasdiqlangan sana</label>
          <input id="tasdiq_sanasi" type="date" max={new Date().toISOString().slice(0, 10)} {...register('tasdiq_sanasi')} />
          {errors.tasdiq_sanasi && <p className="field-error">{errors.tasdiq_sanasi.message}</p>}
        </div>

        <div className={`field ${errors.tasdiq_hujjati ? 'has-error' : ''}`}>
          <label className="label" htmlFor="tasdiq_hujjati">Qaror raqami</label>
          <input id="tasdiq_hujjati" maxLength={100} placeholder="Masalan: 123-son qaror" {...register('tasdiq_hujjati')} />
          {errors.tasdiq_hujjati && <p className="field-error">{errors.tasdiq_hujjati.message}</p>}
        </div>

        <div className="field span-2">
          <label className="label" htmlFor="kelajak_id">Bo'lajak ID raqam</label>
          <input id="kelajak_id" readOnly value={kelajakId ?? ''} placeholder="Tur, hudud va sana tanlanganda ko'rinadi" className="readonly" />
          <p className="muted small">ID tekshiruvchi tasdiqlaganda server tomonidan beriladi.</p>
        </div>
      </div>

      <h2>Hujjat chegarasi</h2>
      <Controller
        control={control}
        name="chegara"
        render={({ field, fieldState }) => (
          <ChegaraEditor value={field.value ?? null} onChange={(g) => { field.onChange(g); field.onBlur() }} error={fieldState.error?.message} />
        )}
      />

      <h2>Fayllar</h2>
      <div className="grid-3">
        {(Object.keys(FAYL_TURLARI) as FaylTur[]).map((t) => (
          <Controller
            key={t}
            control={control}
            name={t}
            render={({ field }) => (
              <FileInput
                label={FAYL_TURLARI[t]}
                value={field.value as File | null}
                onChange={(f) => { field.onChange(f); field.onBlur() }}
                error={fileErr(t)}
                mavjud={mavjud?.fayllar.find((f) => f.tur === t)?.nomi}
              />
            )}
          />
        ))}
      </div>

      {umumiyXato && <p className="alert alert-error">{umumiyXato}</p>}
      {progress != null && (
        <div className="progress" aria-label="Yuklash jarayoni">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span>{progress < 100 ? `Yuklanmoqda: ${progress}%` : 'Server tekshirmoqda…'}</span>
        </div>
      )}

      <div className="actions">
        <Link to={tahrir ? `/arizalar/${id}` : '/arizalar'} className="btn btn-light">Bekor qilish</Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Yuborilmoqda…' : tahrir ? 'Qayta yuborish' : 'Yuborish'}
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
