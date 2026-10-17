import { useRef, useState } from 'react'
import { CircleAlert, FileText, FileUp, X } from 'lucide-react'
import { MAX_FILE_MB } from '../lib/constants'

interface Props {
  label: string
  hint?: string
  value: File | null | undefined
  onChange: (f: File | null) => void
  error?: string
  mavjud?: string // tahrirlashda avval yuklangan fayl nomi
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n < 1024 * 1024 ? 2 : 1)} MB`

/** Fayl maydoni: bosib tanlash yoki sudrab tashlash (drag & drop). */
export default function FileInput({ label, hint, value, onChange, error, mavjud }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const pick = (f: File | null | undefined) => {
    onChange(f ?? null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {value ? (
        <div className="file-chip">
          <span className="fc-icon"><FileText size={18} /></span>
          <div className="fc-body">
            <div className="fc-name" title={value.name}>{value.name}</div>
            <div className="small muted">{mb(value.size)}</div>
          </div>
          <button type="button" className="btn btn-ghost" aria-label="Faylni olib tashlash" onClick={() => pick(null)}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => pick(e.target.files?.[0])} />
          <span className="dz-icon"><FileUp size={18} /></span>
          <span className="dz-title">{mavjud ? `Joriy: ${mavjud}` : 'Faylni tanlang yoki shu yerga tashlang'}</span>
          <span className="dz-sub">{mavjud ? 'Almashtirish uchun yangisini tanlang' : `PDF, JPG yoki PNG · ${MAX_FILE_MB} MB gacha`}</span>
        </label>
      )}
      {error && <p className="field-error"><CircleAlert size={14} />{error}</p>}
    </div>
  )
}
