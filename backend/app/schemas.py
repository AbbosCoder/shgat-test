"""Ariza ma'lumotlarini (multipart'dagi `data` maydoni) tekshirish va javob sxemalari."""

import json
from datetime import date, datetime

from pydantic import BaseModel

from app.geo import GeometryError, validate_chegara
from app.id_gen import HUJJAT_TURLARI
from app.soato import soato_map

MAYDONLAR = ("hujjat_nomi", "hujjat_turi", "soato_kodi", "tasdiq_sanasi", "tasdiq_hujjati", "chegara")
SERVER_MAYDONLARI = ("id_raqam", "holat", "arcgis_object_id")


class ArizaData(BaseModel):
    hujjat_nomi: str
    hujjat_turi: str
    soato_kodi: str
    tasdiq_sanasi: date
    tasdiq_hujjati: str
    chegara: dict


def parse_ariza_data(raw: str | None, today: date | None = None) -> tuple[ArizaData | None, dict[str, str]]:
    """Barcha xatolarni bir yo'la yig'adi — foydalanuvchi hammasini bitta javobda ko'radi."""
    if not raw:
        return None, {"data": "data maydoni majburiy (JSON)"}
    try:
        d = json.loads(raw)
    except json.JSONDecodeError:
        return None, {"data": "data JSON formatida bo'lishi kerak"}
    if not isinstance(d, dict):
        return None, {"data": "data JSON obyekt bo'lishi kerak"}

    today = today or date.today()
    xatolar: dict[str, str] = {}

    for f in SERVER_MAYDONLARI:
        if f in d:
            xatolar[f] = "bu maydonni server yaratadi, qo'lda kiritib bo'lmaydi"

    def text(name: str, limit: int) -> str:
        v = d.get(name)
        if not isinstance(v, str) or not v.strip():
            xatolar[name] = "bo'sh bo'lmasin"
            return ""
        v = v.strip()
        if len(v) > limit:
            xatolar[name] = f"{limit} belgidan oshmasin"
        return v

    hujjat_nomi = text("hujjat_nomi", 255)
    tasdiq_hujjati = text("tasdiq_hujjati", 100)

    hujjat_turi = d.get("hujjat_turi")
    if hujjat_turi not in HUJJAT_TURLARI:
        xatolar["hujjat_turi"] = f"quyidagilardan biri bo'lishi kerak: {', '.join(HUJJAT_TURLARI)}"

    soato = d.get("soato_kodi")
    if not isinstance(soato, str) or len(soato) != 7 or not soato.isdigit():
        xatolar["soato_kodi"] = "7 ta raqamdan iborat bo'lishi kerak"
    elif soato not in soato_map():
        xatolar["soato_kodi"] = "ro'yxatda yo'q"

    sana = None
    raw_sana = d.get("tasdiq_sanasi")
    try:
        if not isinstance(raw_sana, str) or len(raw_sana) != 10:
            raise ValueError
        sana = date.fromisoformat(raw_sana)
        if sana > today:
            xatolar["tasdiq_sanasi"] = "kelajakdagi sana bo'lmasin"
    except ValueError:
        xatolar["tasdiq_sanasi"] = "YYYY-MM-DD formatida bo'lishi kerak"

    chegara = None
    try:
        chegara = validate_chegara(d.get("chegara"))
    except GeometryError as e:
        xatolar["chegara"] = str(e)

    if xatolar:
        return None, xatolar
    return (
        ArizaData(
            hujjat_nomi=hujjat_nomi,
            hujjat_turi=hujjat_turi,
            soato_kodi=soato,
            tasdiq_sanasi=sana,
            tasdiq_hujjati=tasdiq_hujjati,
            chegara=chegara,
        ),
        {},
    )


class FaylOut(BaseModel):
    tur: str
    nomi: str
    hajm: int
    mime: str
    url: str


class ArizaQisqa(BaseModel):
    id: int
    id_raqam: str | None
    hujjat_nomi: str
    hujjat_turi: str
    soato_kodi: str
    soato_nomi: str | None
    tasdiq_sanasi: date
    holat: str
    yaratilgan: datetime


class ArizaToliq(ArizaQisqa):
    tasdiq_hujjati: str
    chegara: dict
    arcgis_object_id: int | None
    qaytarish_sababi: str | None
    yangilangan: datetime
    fayllar: list[FaylOut]


class ArizaRoyxat(BaseModel):
    items: list[ArizaQisqa]
    jami: int


class Yaratildi(BaseModel):
    id: int
    holat: str


class Tasdiqlandi(BaseModel):
    id_raqam: str
    arcgis_object_id: int


class QaytarishSorov(BaseModel):
    sabab: str | None = None


class Soato(BaseModel):
    kod: str
    nomi: str
