import axios, { AxiosError } from 'axios'
import type { ApiXato, ArizaData, ArizaQisqa, ArizaToliq, FaylTur, Foydalanuvchi, Soato } from './types'

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

// --- Sessiya: JWT token har bir so'rovga qo'shiladi; 401 kelsa — login sahifasiga ---
let token: string | null = null
let onUnauthorized: () => void = () => {}
export const setApiToken = (t: string | null) => {
  token = t
}
export const setOnUnauthorized = (fn: () => void) => {
  onUnauthorized = fn
}

// --- Yuqoridagi yuklanish chizig'i uchun: nechta so'rov ketayotganini kuzatamiz ---
let pending = 0
const listeners = new Set<(n: number) => void>()
export const subscribePending = (fn: (n: number) => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
const bump = (d: number) => {
  pending = Math.max(0, pending + d)
  listeners.forEach((fn) => fn(pending))
}

http.interceptors.request.use((cfg) => {
  if (token) cfg.headers.set('Authorization', `Bearer ${token}`)
  bump(1)
  return cfg
})
http.interceptors.response.use(
  (r) => {
    bump(-1)
    return r
  },
  (e: AxiosError) => {
    bump(-1)
    if (e.response?.status === 401 && token && !e.config?.url?.includes('/api/auth/login')) onUnauthorized()
    return Promise.reject(e)
  },
)

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
  login: (login: string, parol: string) =>
    call<{ token: string; muddat: string; foydalanuvchi: Foydalanuvchi }>(http.post('/api/auth/login', { login, parol })),
  me: () => call<Foydalanuvchi>(http.get('/api/auth/me')),

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
