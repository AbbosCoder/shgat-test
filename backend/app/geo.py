"""Chegara geometriyasini tekshirish va GeoJSON → Esri JSON (Web Mercator) o'tkazish."""

import math

# O'zbekiston hududi (topshiriq 4.1-bo'lim)
LON_MIN, LON_MAX = 55.9, 73.2
LAT_MIN, LAT_MAX = 37.1, 45.6

WEB_MERCATOR_WKID = 102100
_R = 6378137.0  # WGS-84 ekvator radiusi, metr


class GeometryError(ValueError):
    pass


def _check_ring(ring, where: str) -> None:
    if not isinstance(ring, list) or len(ring) < 4:
        raise GeometryError(f"{where}: halqada kamida 4 nuqta bo'lishi kerak")
    for i, pt in enumerate(ring):
        if (
            not isinstance(pt, list)
            or len(pt) < 2
            or not all(isinstance(c, (int, float)) and not isinstance(c, bool) for c in pt[:2])
        ):
            raise GeometryError(f"{where}, {i}-nuqta: [uzunlik, kenglik] ko'rinishida bo'lishi kerak")
        lon, lat = pt[0], pt[1]
        if not (LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX):
            raise GeometryError(f"{where}, {i}-nuqta [{lon}, {lat}] O'zbekiston hududidan tashqarida")
    if ring[0][:2] != ring[-1][:2]:
        raise GeometryError(f"{where}: halqa yopilmagan (birinchi va oxirgi nuqta bir xil bo'lishi kerak)")


def polygons_of(geom: dict) -> list[list]:
    """Polygon va MultiPolygon'ni bir xil ko'rinishga keltiradi: poligonlar ro'yxati."""
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


def validate_chegara(geom) -> dict:
    """Topshiriqdagi qoidalar: turi, yopiq halqa, kamida 4 nuqta, O'zbekiston hududi."""
    if not isinstance(geom, dict):
        raise GeometryError("GeoJSON obyekt bo'lishi kerak")
    if geom.get("type") == "Feature":
        geom = geom.get("geometry") or {}
    if geom.get("type") not in ("Polygon", "MultiPolygon"):
        raise GeometryError("turi Polygon yoki MultiPolygon bo'lishi kerak")
    coords = geom.get("coordinates")
    if not isinstance(coords, list) or not coords:
        raise GeometryError("coordinates bo'sh")
    polygons = [coords] if geom["type"] == "Polygon" else coords
    for p_i, polygon in enumerate(polygons):
        if not isinstance(polygon, list) or not polygon:
            raise GeometryError(f"{p_i + 1}-poligon bo'sh")
        for r_i, ring in enumerate(polygon):
            where = f"{p_i + 1}-poligon, {r_i + 1}-halqa" if len(polygons) > 1 else f"{r_i + 1}-halqa"
            _check_ring(ring, where)
    return {"type": geom["type"], "coordinates": coords}


def to_web_mercator(lon: float, lat: float) -> tuple[float, float]:
    """EPSG:4326 (gradus) → EPSG:3857 (metr), sferik Mercator formulasi."""
    x = math.radians(lon) * _R
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * _R
    return x, y


def signed_area(ring: list) -> float:
    """Shoelace formulasi: musbat — soat miliga teskari, manfiy — soat mili bo'yicha."""
    s = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        s += x1 * y2 - x2 * y1
    return s / 2


def _oriented(ring: list, clockwise: bool) -> list:
    is_cw = signed_area(ring) < 0
    return ring if is_cw == clockwise else list(reversed(ring))


def geojson_to_esri(geom: dict) -> dict:
    """GeoJSON (Polygon/MultiPolygon, WGS-84) → Esri JSON polygon (Web Mercator).

    Esri'da tashqi halqa soat mili bo'yicha, ichki (teshik) halqalar teskari yo'nalishda.
    GeoJSON (RFC 7946) da esa aksincha, shuning uchun har bir halqa yo'nalishini tekshirib, kerak bo'lsa aylantiramiz.
    MultiPolygon'ning barcha halqalari bitta rings ro'yxatiga tushadi.
    """
    rings = []
    for polygon in polygons_of(geom):
        for i, ring in enumerate(polygon):
            projected = [list(to_web_mercator(pt[0], pt[1])) for pt in ring]
            rings.append(_oriented(projected, clockwise=(i == 0)))
    return {"rings": rings, "spatialReference": {"wkid": WEB_MERCATOR_WKID}}
