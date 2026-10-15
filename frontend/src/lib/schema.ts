import { z } from 'zod'
import { ALLOWED_EXT, ALLOWED_MIME, HUJJAT_TURLARI, MAX_FILE_BYTES, MAX_FILE_MB } from './constants'
import { chegaraXatosi } from './geo'
import type { Chegara } from './types'

const today = () => new Date().toISOString().slice(0, 10)

/** Fayl tekshiruvi: tur va hajm. null — fayl tanlanmagan. */
export function faylXatosi(f: File | null | undefined, majburiy: boolean): string | null {
  if (!f) return majburiy ? 'Fayl biriktirilmagan' : null
  const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_MIME.includes(f.type) && !ALLOWED_EXT.includes(ext)) return 'Faqat PDF, JPG yoki PNG'
  if (f.size > MAX_FILE_BYTES) return `Hajmi ${MAX_FILE_MB} MB dan oshmasin (${(f.size / 1024 / 1024).toFixed(1)} MB)`
  return null
}

export function arizaSchema(fayllarMajburiy: boolean) {
  const faylMaydon = z
    .custom<File | null>((v) => v == null || v instanceof File)
    .superRefine((f, ctx) => {
      const x = faylXatosi(f, fayllarMajburiy)
      if (x) ctx.addIssue({ code: 'custom', message: x })
    })

  return z.object({
    hujjat_nomi: z.string().trim().min(1, "Hujjat nomini kiriting").max(255, '255 belgidan oshmasin'),
    hujjat_turi: z.enum(HUJJAT_TURLARI, "Hujjat turini tanlang"),
    soato_kodi: z.string().regex(/^\d{7}$/, 'Hududni tanlang'),
    tasdiq_sanasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sanani kiriting')
      .refine((s) => s <= today(), 'Kelajakdagi sana bo\'lmasin'),
    tasdiq_hujjati: z.string().trim().min(1, 'Qaror raqamini kiriting').max(100, '100 belgidan oshmasin'),
    chegara: z.custom<Chegara | null>().superRefine((g, ctx) => {
      const x = chegaraXatosi(g)
      if (x) ctx.addIssue({ code: 'custom', message: x })
    }),
    asosiy_chizma: faylMaydon,
    tushuntirish_xati: faylMaydon,
    tasdiqlovchi_hujjat: faylMaydon,
  })
}

export type ArizaForm = z.input<ReturnType<typeof arizaSchema>>
