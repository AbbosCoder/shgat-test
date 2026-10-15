import { MAX_FILE_MB } from '../lib/constants'

interface Props {
  label: string
  value: File | null | undefined
  onChange: (f: File | null) => void
  error?: string
  mavjud?: string // tahrirlashda avval yuklangan fayl nomi
}

export default function FileInput({ label, value, onChange, error, mavjud }: Props) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      <label className="file-drop">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <span>
          {value
            ? `${value.name} (${(value.size / 1024 / 1024).toFixed(2)} MB)`
            : mavjud
              ? `Joriy: ${mavjud} — almashtirish uchun tanlang`
              : `PDF, JPG yoki PNG, ${MAX_FILE_MB} MB gacha`}
        </span>
      </label>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
