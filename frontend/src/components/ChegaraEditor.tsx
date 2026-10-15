import { useEffect, useRef, useState } from 'react'
import EsriMap from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import Polygon from '@arcgis/core/geometry/Polygon'
import Sketch from '@arcgis/core/widgets/Sketch'
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils'
import { chegaraXatosi, parseGeoJson, polygonsOf, ringsToGeoJson } from '../lib/geo'
import type { Chegara } from '../lib/types'

const FILL = { type: 'simple-fill', color: [37, 99, 235, 0.2], outline: { color: [37, 99, 235], width: 2 } } as const

/** GeoJSON (gradus) → Web Mercator'dagi Esri Polygon: Sketch faqat xarita koordinata tizimida tahrirlaydi. */
function toEsriPolygon(g: Chegara): Polygon {
  const rings = polygonsOf(g).flatMap((poly) => poly.map((ring) => ring.map((p) => [p[0], p[1]])))
  const geo = new Polygon({ rings, spatialReference: { wkid: 4326 } })
  return webMercatorUtils.geographicToWebMercator(geo) as Polygon
}


interface Props {
  value: Chegara | null
  onChange: (g: Chegara | null) => void
  error?: string
}

/** Chegarani xaritada chizish (Sketch) yoki GeoJSON fayldan yuklash. */
export default function ChegaraEditor({ value, onChange, error }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<GraphicsLayer | null>(null)
  const viewRef = useRef<MapView | null>(null)
  const lastEmitted = useRef<Chegara | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [faylXato, setFaylXato] = useState<string | null>(null)

  useEffect(() => {
    const layer = new GraphicsLayer({ title: 'Chegara' })
    const view = new MapView({
      container: divRef.current!,
      map: new EsriMap({ basemap: 'osm', layers: [layer] }),
      center: [64.5, 41.3],
      zoom: 5,
    })
    const sketch = new Sketch({
      view,
      layer,
      creationMode: 'update',
      availableCreateTools: ['polygon', 'rectangle'],
      visibleElements: { selectionTools: { 'lasso-selection': false, 'rectangle-selection': false }, settingsMenu: false },
    })
    view.ui.add(sketch, 'top-right')

    const emit = () => {
      const graphics = layer.graphics.toArray().filter((g) => g.geometry?.type === 'polygon')
      if (graphics.length === 0) {
        lastEmitted.current = null
        onChangeRef.current(null)
        return
      }
      // Bir nechta chizilgan poligon MultiPolygon bo'lib ketadi
      const rings = graphics.flatMap((g) => (webMercatorUtils.webMercatorToGeographic(g.geometry as Polygon) as Polygon).rings)
      const g = ringsToGeoJson(rings as number[][][])
      lastEmitted.current = g
      onChangeRef.current(g)
    }
    sketch.on('create', (e) => {
      if (e.state === 'complete') emit()
    })
    sketch.on('update', (e) => {
      if (e.state === 'complete') emit()
    })
    sketch.on('delete', emit)

    layerRef.current = layer
    viewRef.current = view
    return () => {
      sketch.destroy()
      view.destroy()
      layerRef.current = null
      viewRef.current = null
    }
  }, [])

  // Tashqaridan kelgan qiymat (fayl, tahrirlash rejimi) — xaritaga chizamiz va yaqinlashtiramiz
  useEffect(() => {
    const layer = layerRef.current
    const view = viewRef.current
    if (!layer || !view || value === lastEmitted.current) return
    layer.removeAll()
    if (!value || chegaraXatosiGeometrik(value)) return
    const polygon = toEsriPolygon(value)
    layer.add(new Graphic({ geometry: polygon, symbol: FILL as any }))
    view.when(() => view.goTo(polygon.extent!.clone().expand(1.4)).catch(() => {}))
  }, [value])

  const onFile = async (file: File | undefined) => {
    setFaylXato(null)
    if (!file) return
    try {
      const g = parseGeoJson(await file.text())
      lastEmitted.current = null
      onChange(g)
    } catch (e) {
      setFaylXato((e as Error).message)
    }
  }

  const ogohlantirish = value ? chegaraXatosi(value) : null

  return (
    <div className="chegara-editor">
      <div className="chegara-toolbar">
        <label className="btn btn-light">
          GeoJSON fayl yuklash
          <input type="file" accept=".geojson,.json,application/geo+json,application/json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <span className="muted">yoki xaritaning o'ng tomonidagi asboblar bilan poligon chizing</span>
        {value && (
          <button type="button" className="btn btn-link" onClick={() => { lastEmitted.current = null; onChange(null) }}>
            Tozalash
          </button>
        )}
      </div>
      <div ref={divRef} className="map map-editor" />
      {faylXato && <p className="field-error">{faylXato}</p>}
      {ogohlantirish ? <p className="field-error">⚠ {ogohlantirish}</p> : error && <p className="field-error">{error}</p>}
      {value && !ogohlantirish && <p className="muted small">{describe(value)}</p>}
    </div>
  )
}

// Koordinatasi umuman noto'g'ri bo'lsa (masalan, lat/lon almashgan) — xaritaga chizishga urinmaymiz
function chegaraXatosiGeometrik(g: Chegara): boolean {
  try {
    return polygonsOf(g).some((p) => p.some((r) => r.some((pt) => Math.abs(pt[0]) > 180 || Math.abs(pt[1]) > 85)))
  } catch {
    return true
  }
}

function describe(g: Chegara) {
  const polys = polygonsOf(g)
  const nuqtalar = polys.reduce((s, p) => s + p.reduce((a, r) => a + r.length, 0), 0)
  return `${g.type}: ${polys.length} ta poligon, ${nuqtalar} ta nuqta`
}

