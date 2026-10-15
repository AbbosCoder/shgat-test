import json

from tests.conftest import ARIZA, PDF, TEKSHIRUVCHI, VALID_DATA, yuborish


# ---------- ariza yuborish va validatsiya ----------
def test_create_ok(client):
    r = yuborish(client)
    assert r.status_code == 201, r.text
    assert r.json()["holat"] == "yuborilgan"


def test_create_bad_soato(client):
    r = yuborish(client, {"soato_kodi": "9999999"})
    assert r.status_code == 422
    assert r.json()["maydonlar"]["soato_kodi"] == "ro'yxatda yo'q"


def test_create_file_too_big(client):
    big = PDF + b"0" * (25 * 1024 * 1024)
    r = yuborish(client, asosiy_chizma=("katta.pdf", big, "application/pdf"))
    assert r.status_code == 422
    assert "asosiy_chizma" in r.json()["maydonlar"]


def test_create_wrong_file_type(client):
    r = yuborish(client, tushuntirish_xati=("virus.pdf", b"MZ\x90\x00 not a pdf", "application/pdf"))
    assert r.status_code == 422
    assert "tushuntirish_xati" in r.json()["maydonlar"]


def test_create_missing_file(client):
    r = yuborish(client, tasdiqlovchi_hujjat=None)
    assert r.status_code == 422
    assert "tasdiqlovchi_hujjat" in r.json()["maydonlar"]


def test_create_unclosed_ring(client):
    ring = VALID_DATA["chegara"]["coordinates"][0][:-1] + [[72.31, 40.76]]
    r = yuborish(client, {"chegara": {"type": "Polygon", "coordinates": [ring]}})
    assert r.status_code == 422
    assert "yopilmagan" in r.json()["maydonlar"]["chegara"]


def test_create_paris(client):
    paris = [[2.29, 48.85], [2.35, 48.85], [2.35, 48.87], [2.29, 48.87], [2.29, 48.85]]
    r = yuborish(client, {"chegara": {"type": "Polygon", "coordinates": [paris]}})
    assert r.status_code == 422
    assert "chegara" in r.json()["maydonlar"]


def test_create_future_date_and_empty_name(client):
    r = yuborish(client, {"tasdiq_sanasi": "2999-01-01", "hujjat_nomi": "  "})
    assert r.status_code == 422
    m = r.json()["maydonlar"]
    assert "tasdiq_sanasi" in m and "hujjat_nomi" in m


def test_create_cannot_set_id_raqam(client):
    r = yuborish(client, {"id_raqam": "БР-1703401-2026"})
    assert r.status_code == 422
    assert "id_raqam" in r.json()["maydonlar"]


def test_error_format_is_uniform(client):
    r = yuborish(client, {"hujjat_turi": "XX"})
    body = r.json()
    assert set(body) == {"xato", "maydonlar"}


def test_role_required(client):
    r = client.get("/api/arizalar")
    assert r.status_code == 401
    r = client.post(f"/api/arizalar/1/tasdiqlash", headers=ARIZA)
    assert r.status_code == 403


# ---------- tasdiqlash oqimi (ArcGIS mock) ----------
def test_approve_flow(client, arcgis):
    aid = yuborish(client).json()["id"]
    r = client.post(f"/api/arizalar/{aid}/tasdiqlash", headers=TEKSHIRUVCHI)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id_raqam"] == "БР-1703401-2026"
    assert body["arcgis_object_id"] in arcgis.features

    feature = arcgis.features[body["arcgis_object_id"]]
    assert feature["attributes"] == {"description": "БР-1703401-2026 | Andijon shahri bosh rejasi", "symbolid": 0}
    assert feature["geometry"]["spatialReference"]["wkid"] == 102100

    a = client.get(f"/api/arizalar/{aid}", headers=TEKSHIRUVCHI).json()
    assert a["holat"] == "hisobga_olingan"
    assert a["id_raqam"] == "БР-1703401-2026"


def test_approve_twice_is_409(client):
    aid = yuborish(client).json()["id"]
    client.post(f"/api/arizalar/{aid}/tasdiqlash", headers=TEKSHIRUVCHI)
    r = client.post(f"/api/arizalar/{aid}/tasdiqlash", headers=TEKSHIRUVCHI)
    assert r.status_code == 409


def test_duplicate_id_is_409(client, arcgis):
    first = yuborish(client).json()["id"]
    second = yuborish(client, {"hujjat_nomi": "Boshqa nom, xuddi shu tur/hudud/yil"}).json()["id"]
    assert client.post(f"/api/arizalar/{first}/tasdiqlash", headers=TEKSHIRUVCHI).status_code == 200
    r = client.post(f"/api/arizalar/{second}/tasdiqlash", headers=TEKSHIRUVCHI)
    assert r.status_code == 409
    assert "БР-1703401-2026" in r.json()["xato"]
    assert len(arcgis.features) == 1  # ikkinchi obyekt ArcGIS'ga yozilmadi
    assert client.get(f"/api/arizalar/{second}", headers=TEKSHIRUVCHI).json()["holat"] == "yuborilgan"


def test_arcgis_failure_keeps_state_and_retry_works(client, arcgis):
    aid = yuborish(client).json()["id"]
    arcgis.fail = True
    r = client.post(f"/api/arizalar/{aid}/tasdiqlash", headers=TEKSHIRUVCHI)
    assert r.status_code == 502
    a = client.get(f"/api/arizalar/{aid}", headers=TEKSHIRUVCHI).json()
    assert a["holat"] == "yuborilgan"
    assert a["id_raqam"] is None and a["arcgis_object_id"] is None

    arcgis.fail = False
    r = client.post(f"/api/arizalar/{aid}/tasdiqlash", headers=TEKSHIRUVCHI)
    assert r.status_code == 200
    assert len(arcgis.features) == 1


# ---------- qaytarish va qayta yuborish ----------
def test_return_requires_reason(client):
    aid = yuborish(client).json()["id"]
    r = client.post(f"/api/arizalar/{aid}/qaytarish", json={"sabab": " "}, headers=TEKSHIRUVCHI)
    assert r.status_code == 422
    assert "sabab" in r.json()["maydonlar"]


def test_return_and_resubmit(client):
    aid = yuborish(client).json()["id"]
    r = client.post(f"/api/arizalar/{aid}/qaytarish", json={"sabab": "Chegara noto'g'ri"}, headers=TEKSHIRUVCHI)
    assert r.status_code == 200
    assert r.json()["holat"] == "qaytarilgan"

    fixed = dict(VALID_DATA, hujjat_nomi="Tuzatilgan nom")
    r = client.put(f"/api/arizalar/{aid}", data={"data": json.dumps(fixed, ensure_ascii=False)}, headers=ARIZA)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["holat"] == "yuborilgan"
    assert body["hujjat_nomi"] == "Tuzatilgan nom"
    assert len(body["fayllar"]) == 3  # fayllar yuborilmasa, eskilari qoladi


def test_put_only_for_returned(client):
    aid = yuborish(client).json()["id"]
    r = client.put(f"/api/arizalar/{aid}", data={"data": json.dumps(VALID_DATA)}, headers=ARIZA)
    assert r.status_code == 409


def test_cannot_return_approved(client):
    aid = yuborish(client).json()["id"]
    client.post(f"/api/arizalar/{aid}/tasdiqlash", headers=TEKSHIRUVCHI)
    r = client.post(f"/api/arizalar/{aid}/qaytarish", json={"sabab": "x"}, headers=TEKSHIRUVCHI)
    assert r.status_code == 409


# ---------- ro'yxat, ko'rish, fayllar ----------
def test_list_filters_and_pagination(client):
    for nomi in ("A", "B", "C"):
        yuborish(client, {"hujjat_nomi": nomi})
    yuborish(client, {"hujjat_turi": "ЛШ"})
    r = client.get("/api/arizalar", params={"hujjat_turi": "БР", "hajm": 2, "sahifa": 1}, headers=TEKSHIRUVCHI)
    body = r.json()
    assert body["jami"] == 3 and len(body["items"]) == 2
    r = client.get("/api/arizalar", params={"hujjat_turi": "БР", "hajm": 2, "sahifa": 2}, headers=TEKSHIRUVCHI)
    assert len(r.json()["items"]) == 1
    r = client.get("/api/arizalar", params={"holat": "qaytarilgan"}, headers=TEKSHIRUVCHI)
    assert r.json()["jami"] == 0


def test_detail_404(client):
    r = client.get("/api/arizalar/999", headers=ARIZA)
    assert r.status_code == 404
    assert r.json()["xato"]


def test_file_download(client):
    aid = yuborish(client).json()["id"]
    a = client.get(f"/api/arizalar/{aid}", headers=ARIZA).json()
    url = a["fayllar"][0]["url"]
    r = client.get(url)
    assert r.status_code == 200
    assert r.content.startswith(b"%PDF")


def test_soato_list(client):
    r = client.get("/api/soato", headers=ARIZA)
    assert {"kod": "1703401", "nomi": "Andijon shahri"} in r.json()
