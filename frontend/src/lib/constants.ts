import type { FaylTur, Holat } from './types'

export const HUJJAT_TURLARI = ['БСХ', 'ҲРС', 'ТРЛ', 'БР', 'БРЛ', 'ҚР', 'ЛШ'] as const

export const HOLATLAR: Record<Holat, string> = {
  yuborilgan: 'Yuborilgan',
  hisobga_olingan: 'Hisobga olingan',
  qaytarilgan: 'Qaytarilgan',
}

export const FAYL_TURLARI: Record<FaylTur, string> = {
  asosiy_chizma: 'Asosiy chizma',
  tushuntirish_xati: 'Tushuntirish xati',
  tasdiqlovchi_hujjat: 'Tasdiqlovchi hujjat',
}

export const MAX_FILE_MB = 20
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
export const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png']

// Topshiriqdagi ochiq qatlam
export const ARCGIS_LAYER_URL =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2'

export const PAGE_SIZE = 10
