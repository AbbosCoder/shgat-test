import math

import pytest

from app.geo import GeometryError, geojson_to_esri, signed_area, to_web_mercator, validate_chegara

SQUARE_CCW = [[72.30, 40.75], [72.40, 40.75], [72.40, 40.81], [72.30, 40.81], [72.30, 40.75]]


# ---------- chegara tekshiruvi ----------
def test_valid_polygon():
    assert validate_chegara({"type": "Polygon", "coordinates": [SQUARE_CCW]})["type"] == "Polygon"


def test_valid_multipolygon():
    other = [[p[0] - 1, p[1]] for p in SQUARE_CCW]
    validate_chegara({"type": "MultiPolygon", "coordinates": [[SQUARE_CCW], [other]]})


def test_feature_wrapper_is_unwrapped():
    g = validate_chegara({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [SQUARE_CCW]}})
    assert g["type"] == "Polygon"


def test_unclosed_ring():
    with pytest.raises(GeometryError, match="yopilmagan"):
        validate_chegara({"type": "Polygon", "coordinates": [SQUARE_CCW[:-1] + [[72.31, 40.76]]]})


def test_too_few_points():
    with pytest.raises(GeometryError, match="kamida 4"):
        validate_chegara({"type": "Polygon", "coordinates": [[[72.3, 40.75], [72.4, 40.75], [72.3, 40.75]]]})


def test_paris_is_outside_uzbekistan():
    paris = [[2.29, 48.85], [2.35, 48.85], [2.35, 48.87], [2.29, 48.87], [2.29, 48.85]]
    with pytest.raises(GeometryError, match="tashqarida"):
        validate_chegara({"type": "Polygon", "coordinates": [paris]})


def test_swapped_lat_lon_is_rejected():
    swapped = [[p[1], p[0]] for p in SQUARE_CCW]
    with pytest.raises(GeometryError):
        validate_chegara({"type": "Polygon", "coordinates": [swapped]})


@pytest.mark.parametrize("geom", [None, {}, {"type": "Point", "coordinates": [72.3, 40.7]}, {"type": "Polygon"}])
def test_wrong_type(geom):
    with pytest.raises(GeometryError):
        validate_chegara(geom)


# ---------- koordinata o'tkazish ----------
def test_web_mercator_origin():
    assert to_web_mercator(0, 0) == pytest.approx((0.0, 0.0), abs=1e-6)


def test_web_mercator_known_point():
    # Andijon atrofi. Kutilgan qiymat Esri'ning GeometryServer/project xizmatidan olingan (4326 → 102100)
    x, y = to_web_mercator(72.3442, 40.7821)
    assert x == pytest.approx(8053319.5058, abs=0.01)
    assert y == pytest.approx(4980254.3967, abs=0.01)


def test_web_mercator_edge_of_world():
    x, _ = to_web_mercator(180, 0)
    assert x == pytest.approx(20037508.34, abs=0.01)


# ---------- halqa yo'nalishi ----------
def test_esri_outer_ring_is_clockwise():
    esri = geojson_to_esri({"type": "Polygon", "coordinates": [SQUARE_CCW]})
    assert esri["spatialReference"]["wkid"] == 102100
    assert signed_area(esri["rings"][0]) < 0  # manfiy = soat mili bo'yicha


def test_esri_already_clockwise_input_kept_clockwise():
    cw = list(reversed(SQUARE_CCW))
    esri = geojson_to_esri({"type": "Polygon", "coordinates": [cw]})
    assert signed_area(esri["rings"][0]) < 0


def test_esri_hole_is_counter_clockwise():
    hole_cw = [[72.33, 40.77], [72.33, 40.79], [72.37, 40.79], [72.37, 40.77], [72.33, 40.77]]
    esri = geojson_to_esri({"type": "Polygon", "coordinates": [SQUARE_CCW, hole_cw]})
    assert signed_area(esri["rings"][0]) < 0
    assert signed_area(esri["rings"][1]) > 0


def test_esri_multipolygon_flattens_rings():
    other = [[p[0] - 1, p[1]] for p in SQUARE_CCW]
    esri = geojson_to_esri({"type": "MultiPolygon", "coordinates": [[SQUARE_CCW], [other]]})
    assert len(esri["rings"]) == 2
    assert all(signed_area(r) < 0 for r in esri["rings"])


def test_esri_coordinates_are_meters():
    esri = geojson_to_esri({"type": "Polygon", "coordinates": [SQUARE_CCW]})
    xs = [p[0] for p in esri["rings"][0]]
    assert all(8_000_000 < x < 8_100_000 for x in xs)
    assert math.isclose(esri["rings"][0][0][0], esri["rings"][0][-1][0])
