import type { Chegara, Position } from './types'

// O'zbekiston hududi (topshiriq 4.1)
export const BOUNDS = { lonMin: 55.9, lonMax: 73.2, latMin: 37.1, latMax: 45.6 }

export function polygonsOf(g: Chegara): Position[][][] {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates
}

/** Chegarani tekshiradi; xato bo'lsa tushunarli matn, aks holda null qaytaradi. */
export function chegaraXatosi(g: unknown): string | null {
  if (!g || typeof g !== 'object') return 'Chegara kiritilmagan'
  const geom = g as { type?: string; coordinates?: unknown }
  if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') return 'Faqat Polygon yoki MultiPolygon qabul qilinadi'
  if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) return 'Koordinatalar bo\'sh'
  const polygons = geom.type === 'Polygon' ? [geom.coordinates] : (geom.coordinates as unknown[])
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) return 'Poligon bo\'sh'
    for (const ring of polygon as unknown[]) {
      if (!Array.isArray(ring) || ring.length < 4) return 'Halqada kamida 4 nuqta bo\'lishi kerak'
      for (const pt of ring) {
        if (!Array.isArray(pt) || typeof pt[0] !== 'number' || typeof pt[1] !== 'number')
          return 'Nuqta [uzunlik, kenglik] ko\'rinishida bo\'lishi kerak'
        const [lon, lat] = pt
        if (lon < BOUNDS.lonMin || lon > BOUNDS.lonMax || lat < BOUNDS.latMin || lat > BOUNDS.latMax)
          return `Chegara O'zbekiston hududidan tashqarida: [${lon}, ${lat}]`
      }
      const first = ring[0] as number[]
      const last = ring[ring.length - 1] as number[]
      if (first[0] !== last[0] || first[1] !== last[1]) return 'Halqa yopilmagan: birinchi va oxirgi nuqta bir xil bo\'lishi kerak'
    }
  }
  return null
}

/** GeoJSON matnidan Polygon/MultiPolygon ajratib oladi (Feature va FeatureCollection ham qabul qilinadi). */
export function parseGeoJson(text: string): Chegara {
  let obj: any
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('Fayl GeoJSON (JSON) formatida emas')
  }
  if (obj?.type === 'FeatureCollection') {
    const polys = (obj.features ?? []).map((f: any) => f?.geometry).filter((g: any) => g?.type === 'Polygon' || g?.type === 'MultiPolygon')
    if (polys.length === 0) throw new Error('Faylda poligon topilmadi')
    if (polys.length === 1) obj = polys[0]
    else obj = { type: 'MultiPolygon', coordinates: polys.flatMap((g: Chegara) => polygonsOf(g)) }
  } else if (obj?.type === 'Feature') {
    obj = obj.geometry
  }
  if (obj?.type !== 'Polygon' && obj?.type !== 'MultiPolygon') throw new Error('Geometriya turi Polygon yoki MultiPolygon bo\'lishi kerak')
  return { type: obj.type, coordinates: obj.coordinates }
}

/** Shoelace: musbat — soat miliga teskari. */
export function signedArea(ring: Position[]): number {
  let s = 0
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  return s / 2
}

/** Esri polygon rings (lon/lat) → GeoJSON. Esri'da tashqi halqa soat mili bo'yicha, teshiklar teskari. */
export function ringsToGeoJson(rings: Position[][]): Chegara {
  const polygons: Position[][][] = []
  for (const ring of rings) {
    const r = ring.map((p) => [round(p[0]), round(p[1])])
    const clockwise = signedArea(r) < 0
    if (clockwise || polygons.length === 0) polygons.push([r.slice().reverse()]) // GeoJSON: tashqi halqa CCW
    else polygons[polygons.length - 1].push(r.slice().reverse())
  }
  return polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } : { type: 'MultiPolygon', coordinates: polygons }
}

const round = (n: number) => Math.round(n * 1e7) / 1e7

/** Bo'lajak ID: {tur}-{soato}-{yil}. Biror qismi bo'lmasa — null. */
export function bolajakId(turi?: string, soato?: string, sana?: string): string | null {
  const yil = sana && /^\d{4}-\d{2}-\d{2}$/.test(sana) ? sana.slice(0, 4) : null
  if (!turi || !soato || !yil) return null
  return `${turi}-${soato}-${yil}`
}
