import { describe, expect, it } from 'vitest'
import { arizaSchema, faylXatosi } from './schema'

const pdf = (bytes = 10, name = 'a.pdf') => new File([new Uint8Array(bytes)], name, { type: 'application/pdf' })
const valid = () => ({
  hujjat_nomi: 'Andijon shahri bosh rejasi',
  hujjat_turi: 'БР',
  soato_kodi: '1703401',
  tasdiq_sanasi: '2026-03-12',
  tasdiq_hujjati: '123-son qaror',
  chegara: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] },
  asosiy_chizma: pdf(),
  tushuntirish_xati: pdf(),
  tasdiqlovchi_hujjat: pdf(),
})

describe('faylXatosi', () => {
  it('25 MB faylni rad etadi', () => {
    expect(faylXatosi(pdf(25 * 1024 * 1024), true)).toMatch(/20 MB/)
  })
  it('exe faylni rad etadi', () => {
    expect(faylXatosi(new File(['x'], 'virus.exe', { type: 'application/x-msdownload' }), true)).toMatch(/PDF/)
  })
  it("tahrirlashda fayl ixtiyoriy", () => {
    expect(faylXatosi(null, false)).toBeNull()
    expect(faylXatosi(null, true)).toMatch(/biriktirilmagan/)
  })
})

describe('arizaSchema', () => {
  it("to'g'ri arizani o'tkazadi", () => {
    expect(arizaSchema(true).safeParse(valid()).success).toBe(true)
  })
  it('kelajakdagi sanani rad etadi', () => {
    const r = arizaSchema(true).safeParse({ ...valid(), tasdiq_sanasi: '2999-01-01' })
    expect(r.success).toBe(false)
    expect(r.error!.issues.map((i) => i.path[0])).toContain('tasdiq_sanasi')
  })
  it("noma'lum hujjat turini rad etadi", () => {
    expect(arizaSchema(true).safeParse({ ...valid(), hujjat_turi: 'XX' }).success).toBe(false)
  })
  it("bo'sh nom va yo'q chegarani birga ko'rsatadi", () => {
    const r = arizaSchema(true).safeParse({ ...valid(), hujjat_nomi: '  ', chegara: null })
    const paths = r.error!.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['hujjat_nomi', 'chegara']))
  })
})
