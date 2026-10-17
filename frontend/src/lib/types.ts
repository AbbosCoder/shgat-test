export type Holat = 'yuborilgan' | 'hisobga_olingan' | 'qaytarilgan'
export type Rol = 'ariza_beruvchi' | 'tekshiruvchi'
export type FaylTur = 'asosiy_chizma' | 'tushuntirish_xati' | 'tasdiqlovchi_hujjat'

export type Position = [number, number] | number[]
export type GeoPolygon = { type: 'Polygon'; coordinates: Position[][] }
export type GeoMultiPolygon = { type: 'MultiPolygon'; coordinates: Position[][][] }
export type Chegara = GeoPolygon | GeoMultiPolygon

export interface ArizaData {
  hujjat_nomi: string
  hujjat_turi: string
  soato_kodi: string
  tasdiq_sanasi: string
  tasdiq_hujjati: string
  chegara: Chegara
}

export interface ArizaQisqa {
  id: number
  id_raqam: string | null
  hujjat_nomi: string
  hujjat_turi: string
  soato_kodi: string
  soato_nomi: string | null
  tasdiq_sanasi: string
  holat: Holat
  yaratilgan: string
}

export interface FaylInfo {
  tur: FaylTur
  nomi: string
  hajm: number
  mime: string
  url: string
}

export interface ArizaToliq extends ArizaQisqa {
  tasdiq_hujjati: string
  chegara: Chegara
  arcgis_object_id: number | null
  qaytarish_sababi: string | null
  yangilangan: string
  fayllar: FaylInfo[]
}

export interface Soato {
  kod: string
  nomi: string
}

export interface ApiXato {
  xato: string
  maydonlar: Record<string, string>
}

export interface Foydalanuvchi {
  login: string
  ism: string
  rol: Rol
}
