import { useEffect, useRef, useState } from 'react'
import EsriMap from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import Graphic from '@arcgis/core/Graphic'
import Polygon from '@arcgis/core/geometry/Polygon'
import { ARCGIS_LAYER_URL } from '../lib/constants'
import { polygonsOf } from '../lib/geo'
import type { Chegara } from '../lib/types'

interface Props {
  chegara: Chegara
  /** Berilsa, chegara bazadan emas, to'g'ridan-to'g'ri ochiq ArcGIS qatlamidan olinadi */
  objectId?: number | null
}

/** Ariza sahifasidagi xarita. Hisobga olingan hujjat uchun FeatureLayer objectid bo'yicha filtrlanadi. */
export default function ChegaraMap({ chegara, objectId }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const [xabar, setXabar] = useState<string | null>(null)

  useEffect(() => {
    let active = true // komponent yopilgandan keyin kelgan javoblar e'tiborsiz qoldiriladi
    setXabar(null)
    const map = new EsriMap({ basemap: 'osm' })
    const view = new MapView({ container: divRef.current!, map, center: [64.5, 41.3], zoom: 5 })

    if (objectId != null) {
      const layer = new FeatureLayer({
        url: ARCGIS_LAYER_URL,
        definitionExpression: `objectid = ${Number(objectId)}`,
        outFields: ['objectid', 'description'],
        title: 'Hisobga olingan chegara',
        renderer: {
          type: 'simple',
          symbol: { type: 'simple-fill', color: [22, 163, 74, 0.25], outline: { color: [22, 163, 74], width: 2 } },
        } as any,
        popupTemplate: { title: 'ArcGIS obyekt {objectid}', content: '{description}' },
      })
      map.add(layer)
      layer
        .queryExtent()
        .then(({ count, extent }) => {
          if (!active) return
          if (!count || !extent) {
            setXabar(`ArcGIS qatlamida objectid=${objectId} topilmadi. Bu umumiy test serveri, Esri ma'lumotlarni vaqti-vaqti bilan tozalaydi.`)
            return
          }
          return view.goTo(extent.expand(1.4)).catch(() => {})
        })
        .catch((e) => {
          if (!active) return
          console.error('ArcGIS qatlami:', e)
          setXabar('ArcGIS qatlamiga ulanib bo\'lmadi. Internet aloqasini tekshiring.')
        })
    } else {
      const layer = new GraphicsLayer()
      map.add(layer)
      const rings = polygonsOf(chegara).flatMap((p) => p.map((r) => r.map((pt) => [pt[0], pt[1]])))
      const polygon = new Polygon({ rings, spatialReference: { wkid: 4326 } })
      layer.add(
        new Graphic({
          geometry: polygon,
          symbol: { type: 'simple-fill', color: [37, 99, 235, 0.2], outline: { color: [37, 99, 235], width: 2 } } as any,
        }),
      )
      view.when(() => view.goTo(polygon.extent!.clone().expand(1.4)).catch(() => {}))
    }
    return () => {
      active = false
      view.destroy()
    }
  }, [chegara, objectId])

  return (
    <div>
      <div ref={divRef} className="map" />
      {objectId != null && !xabar && <p className="muted small">Chegara ochiq ArcGIS qatlamidan olindi (objectid = {objectId}).</p>}
      {xabar && <p className="alert alert-warn">{xabar}</p>}
    </div>
  )
}
