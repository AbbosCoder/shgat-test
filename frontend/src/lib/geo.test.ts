import { describe, expect, it } from 'vitest'
import { bolajakId, chegaraXatosi, parseGeoJson, ringsToGeoJson, signedArea } from './geo'

const SQUARE = [[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]

describe('chegaraXatosi', () => {
  it("to'g'ri poligonni qabul qiladi", () => {
    expect(chegaraXatosi({ type: 'Polygon', coordinates: [SQUARE] })).toBeNull()
  })
  it('Parij koordinatalarini rad etadi', () => {
    const paris = [[2.29, 48.85], [2.35, 48.85], [2.35, 48.87], [2.29, 48.87], [2.29, 48.85]]
    expect(chegaraXatosi({ type: 'Polygon', coordinates: [paris] })).toMatch(/tashqarida/)
  })
  it('yopilmagan halqani rad etadi', () => {
    expect(chegaraXatosi({ type: 'Polygon', coordinates: [[...SQUARE.slice(0, 4), [72.31, 40.76]]] })).toMatch(/yopilmagan/)
  })
  it("4 nuqtadan kam bo'lsa rad etadi", () => {
    expect(chegaraXatosi({ type: 'Polygon', coordinates: [[SQUARE[0], SQUARE[1], SQUARE[0]]] })).toMatch(/kamida 4/)
  })
  it('Point turini rad etadi', () => {
    expect(chegaraXatosi({ type: 'Point', coordinates: [72, 40] })).toMatch(/Polygon/)
  })
})

describe('parseGeoJson', () => {
  it('Feature ichidan geometriyani oladi', () => {
    const g = parseGeoJson(JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [SQUARE] } }))
    expect(g.type).toBe('Polygon')
  })
  it("bir nechta poligonli FeatureCollection'ni MultiPolygon qiladi", () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [SQUARE] } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [SQUARE] } },
      ],
    }
    const g = parseGeoJson(JSON.stringify(fc))
    expect(g.type).toBe('MultiPolygon')
    expect(g.coordinates).toHaveLength(2)
  })
  it("JSON bo'lmagan faylda tushunarli xato beradi", () => {
    expect(() => parseGeoJson('salom')).toThrow(/GeoJSON/)
  })
})

describe('ringsToGeoJson (Sketch → GeoJSON)', () => {
  const cw = [...SQUARE].reverse() // Esri'da tashqi halqa soat mili bo'yicha
  it("tashqi halqani GeoJSON uchun soat miliga teskari qiladi", () => {
    const g = ringsToGeoJson([cw])
    expect(g.type).toBe('Polygon')
    expect(signedArea(g.coordinates[0] as number[][])).toBeGreaterThan(0)
  })
  it('ikki tashqi halqa — MultiPolygon', () => {
    const other = cw.map(([x, y]) => [x - 1, y])
    expect(ringsToGeoJson([cw, other]).type).toBe('MultiPolygon')
  })
  it('teskari yo\'nalishdagi halqa — teshik sifatida shu poligonga qo\'shiladi', () => {
    const hole = [[72.33, 40.77], [72.37, 40.77], [72.37, 40.79], [72.33, 40.79], [72.33, 40.77]] // CCW
    const g = ringsToGeoJson([cw, hole])
    expect(g.type).toBe('Polygon')
    expect(g.coordinates).toHaveLength(2)
  })
})

describe('bolajakId', () => {
  it('tur, SOATO va sana yilidan yasaladi', () => {
    expect(bolajakId('БР', '1703401', '2026-03-12')).toBe('БР-1703401-2026')
  })
  it("biror qism bo'lmasa null", () => {
    expect(bolajakId('БР', '', '2026-03-12')).toBeNull()
    expect(bolajakId('БР', '1703401', '')).toBeNull()
  })
})
