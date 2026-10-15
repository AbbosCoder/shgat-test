import axios, { AxiosError } from 'axios'
import type { ApiXato, ArizaData, ArizaQisqa, ArizaToliq, FaylTur, Rol, Soato } from './types'

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

let currentRol: Rol = 'ariza_beruvchi'
export const setApiRol = (rol: Rol) => {
  currentRol = rol
}
http.interceptors.request.use((cfg) => {
  cfg.headers.set('X-Rol', currentRol)
  return cfg
})

export class ApiError extends Error {
  status: number
  maydonlar: Record<string, string>
  constructor(status: number, xato: string, maydonlar: Record<string, string> = {}) {
    super(xato)
    this.status = status
    this.maydonlar = maydonlar
  }
}

/** Server xatosini foydalanuvchi tushunadigan matnga aylantiradi. */
function toApiError(e: unknown): ApiError {
  const err = e as AxiosError<ApiXato>
  if (!err.response) return new ApiError(0, 'Server bilan aloqa yo\'q. Internetni tekshiring yoki birozdan keyin qayta urinib ko\'ring.')
  const { status, data } = err.response
  const xato = data?.xato || `Server xatosi (${status})`
  return new ApiError(status, xato, data?.maydonlar ?? {})
}

async function call<T>(p: Promise<{ data: T }>): Promise<T> {
  try {
    return (await p).data
  } catch (e) {
    throw toApiError(e)
  }
}

export interface RoyxatFiltr {
  holat?: string
  hujjat_turi?: string
  soato_kodi?: string
  sahifa?: number
  hajm?: number
}

export const api = {
  royxat: (f: RoyxatFiltr) =>
    call<{ items: ArizaQisqa[]; jami: number }>(
      http.get('/api/arizalar', { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null)) }),
    ),
  ariza: (id: number | string) => call<ArizaToliq>(http.get(`/api/arizalar/${id}`)),
  soato: () => call<Soato[]>(http.get('/api/soato')),

  yuborish: (data: ArizaData, files: Partial<Record<FaylTur, File>>, onProgress?: (pct: number) => void) =>
    call<{ id: number; holat: string }>(http.post('/api/arizalar', formData(data, files), progress(onProgress))),

  qaytaYuborish: (id: number, data: ArizaData, files: Partial<Record<FaylTur, File>>, onProgress?: (pct: number) => void) =>
    call<ArizaToliq>(http.put(`/api/arizalar/${id}`, formData(data, files), progress(onProgress))),

  tasdiqlash: (id: number) => call<{ id_raqam: string; arcgis_object_id: number }>(http.post(`/api/arizalar/${id}/tasdiqlash`)),
  qaytarish: (id: number, sabab: string) => call<ArizaToliq>(http.post(`/api/arizalar/${id}/qaytarish`, { sabab })),
}

function formData(data: ArizaData, files: Partial<Record<FaylTur, File>>) {
  const fd = new FormData()
  fd.append('data', JSON.stringify(data))
  for (const [tur, file] of Object.entries(files)) if (file) fd.append(tur, file)
  return fd
}

function progress(onProgress?: (pct: number) => void) {
  return {
    onUploadProgress: (e: { loaded: number; total?: number }) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  }
}

/** 409 / 502 kabi javoblar uchun oddiy tildagi izoh. */
export function tushunarliXato(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Kutilmagan xato yuz berdi'
  switch (e.status) {
    case 409:
      return `Amalni bajarib bo'lmadi: ${e.message}`
    case 502:
      return `ArcGIS xizmati hozir javob bermayapti, ariza holati o'zgarmadi. Birozdan keyin "Tasdiqlash"ni qayta bosing. (${e.message})`
    case 404:
      return 'Ariza topilmadi'
    default:
      return e.message
  }
}
