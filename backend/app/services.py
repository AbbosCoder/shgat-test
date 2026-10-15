"""Ariza holatlari bo'yicha biznes mantiq (HTTP'dan mustaqil — testlash oson)."""

import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.arcgis import ArcGISClient, ArcGISError
from app.errors import ApiError
from app.geo import geojson_to_esri
from app.id_gen import make_description, make_id_raqam
from app.models import HOLAT_HISOBGA_OLINGAN, HOLAT_QAYTARILGAN, HOLAT_YUBORILGAN, Ariza

log = logging.getLogger("services")


def get_ariza(db: Session, ariza_id: int, for_update: bool = False) -> Ariza:
    stmt = select(Ariza).where(Ariza.id == ariza_id)
    if for_update:
        # PostgreSQL'da qatorni qulflaydi: ikki tekshiruvchi bir vaqtda tasdiqlay olmaydi (SQLite e'tiborsiz qoldiradi)
        stmt = stmt.with_for_update()
    ariza = db.scalar(stmt)
    if ariza is None:
        raise ApiError(404, "Ariza topilmadi")
    return ariza


def tasdiqlash(db: Session, ariza_id: int, arcgis: ArcGISClient) -> Ariza:
    """yuborilgan → hisobga_olingan.

    Tartib muhim: avval ID bandligini tekshiramiz, keyin ArcGIS'ga yozamiz, eng oxirida bazaga saqlaymiz.
    ArcGIS xato bersa, bazada hech narsa o'zgarmaydi (ID saqlanmaydi, holat yuborilgan qoladi) → 502.
    """
    ariza = get_ariza(db, ariza_id, for_update=True)
    if ariza.holat != HOLAT_YUBORILGAN:
        raise ApiError(409, f"Faqat yuborilgan arizani tasdiqlash mumkin (hozirgi holat: {ariza.holat})")

    id_raqam = make_id_raqam(ariza.hujjat_turi, ariza.soato_kodi, ariza.tasdiq_sanasi)
    band = db.scalar(select(Ariza.id).where(Ariza.id_raqam == id_raqam, Ariza.id != ariza.id))
    if band is not None:
        raise ApiError(
            409,
            f"{id_raqam} raqami allaqachon {band}-arizaga berilgan. Shu tur, hudud va yil uchun hujjat "
            f"avval ro'yxatga olingan — ma'lumotlarni tekshiring.",
            {"id_raqam": "takrorlanmoqda"},
        )

    try:
        object_id = arcgis.add_feature_once(
            geojson_to_esri(ariza.chegara),
            {"description": make_description(id_raqam, ariza.hujjat_nomi), "symbolid": 0},
            dedupe_prefix=f"{id_raqam} |",
        )
    except ArcGISError as e:
        db.rollback()
        log.error("Ariza %s: ArcGIS'ga yozib bo'lmadi: %s", ariza_id, e)
        raise ApiError(502, f"Chegarani ArcGIS qatlamiga yozib bo'lmadi, keyinroq qayta urinib ko'ring. ({e})")

    ariza.id_raqam = id_raqam
    ariza.arcgis_object_id = object_id
    ariza.holat = HOLAT_HISOBGA_OLINGAN
    ariza.qaytarish_sababi = None
    try:
        db.commit()
    except IntegrityError:
        # Juda kam holat: parallel so'rov xuddi shu ID'ni bizdan oldin saqlab ulgurdi
        db.rollback()
        raise ApiError(409, f"{id_raqam} raqami boshqa arizaga berildi", {"id_raqam": "takrorlanmoqda"})
    db.refresh(ariza)
    return ariza


def qaytarish(db: Session, ariza_id: int, sabab: str | None) -> Ariza:
    """yuborilgan → qaytarilgan, sabab majburiy."""
    sabab = (sabab or "").strip()
    if not sabab:
        raise ApiError(422, "Qaytarish sababi majburiy", {"sabab": "bo'sh bo'lmasin"})
    ariza = get_ariza(db, ariza_id, for_update=True)
    if ariza.holat != HOLAT_YUBORILGAN:
        raise ApiError(409, f"Faqat yuborilgan arizani qaytarish mumkin (hozirgi holat: {ariza.holat})")
    ariza.holat = HOLAT_QAYTARILGAN
    ariza.qaytarish_sababi = sabab
    db.commit()
    db.refresh(ariza)
    return ariza
