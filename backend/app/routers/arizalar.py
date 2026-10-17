from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import services, storage
from app.arcgis import ArcGISClient, get_arcgis
from app.db import get_db
from app.deps import ARIZA_BERUVCHI, TEKSHIRUVCHI, get_rol, require
from app.errors import ApiError, ValidationFailed
from app.models import HOLAT_QAYTARILGAN, HOLAT_YUBORILGAN, Ariza, Fayl
from app.security import sign_file, verify_file
from app.schemas import (
    ArizaData,
    ArizaQisqa,
    ArizaRoyxat,
    ArizaToliq,
    FaylOut,
    QaytarishSorov,
    Tasdiqlandi,
    Yaratildi,
    parse_ariza_data,
)
from app.soato import soato_map
from app.storage import FAYL_TURLARI

router = APIRouter(prefix="/api/arizalar", tags=["arizalar"])

HOLATLAR = ("yuborilgan", "hisobga_olingan", "qaytarilgan")


# ---------- yordamchilar ----------
def _qisqa(a: Ariza) -> dict:
    return dict(
        id=a.id,
        id_raqam=a.id_raqam,
        hujjat_nomi=a.hujjat_nomi,
        hujjat_turi=a.hujjat_turi,
        soato_kodi=a.soato_kodi,
        soato_nomi=soato_map().get(a.soato_kodi),
        tasdiq_sanasi=a.tasdiq_sanasi,
        holat=a.holat,
        yaratilgan=a.yaratilgan,
    )


def _toliq(a: Ariza, request: Request) -> ArizaToliq:
    fayllar = [
        FaylOut(
            tur=f.tur,
            nomi=f.asl_nomi,
            hajm=f.hajm,
            mime=f.mime,
            url=f'{request.url_for("fayl_yuklab_olish", ariza_id=a.id, tur=f.tur)}?t={sign_file(a.id, f.tur)}',
        )
        for f in sorted(a.fayllar, key=lambda f: list(FAYL_TURLARI).index(f.tur))
    ]
    return ArizaToliq(
        **_qisqa(a),
        tasdiq_hujjati=a.tasdiq_hujjati,
        chegara=a.chegara,
        arcgis_object_id=a.arcgis_object_id,
        qaytarish_sababi=a.qaytarish_sababi,
        yangilangan=a.yangilangan,
        fayllar=fayllar,
    )


def _validate(data: str | None, files: dict[str, UploadFile | None], fayllar_majburiy: bool):
    """data va fayllardagi barcha xatolarni yig'ib, bitta 422 javobda qaytaradi."""
    parsed, xatolar = parse_ariza_data(data)
    checked = []
    for tur, upload in files.items():
        if upload is None or not upload.filename:
            if fayllar_majburiy:
                xatolar[tur] = f"{FAYL_TURLARI[tur]} biriktirilmagan"
            continue
        ok, err = storage.check_upload(tur, upload)
        if err:
            xatolar[tur] = err
        else:
            checked.append(ok)
    if xatolar:
        raise ValidationFailed(xatolar)
    return parsed, checked


def _apply(a: Ariza, d: ArizaData) -> None:
    a.hujjat_nomi = d.hujjat_nomi
    a.hujjat_turi = d.hujjat_turi
    a.soato_kodi = d.soato_kodi
    a.tasdiq_sanasi = d.tasdiq_sanasi
    a.tasdiq_hujjati = d.tasdiq_hujjati
    a.chegara = d.chegara


def _save_files(db: Session, a: Ariza, checked) -> tuple[list[str], list[str]]:
    """Fayllarni saqlaydi; yangi yo'llar (xatoda o'chirish uchun) va almashtirilgan eski yo'llarni qaytaradi."""
    new_paths, old_paths = [], []
    existing = {f.tur: f for f in a.fayllar}
    for c in checked:
        rel = storage.save(a.id, c)
        new_paths.append(rel)
        if c.tur in existing:
            old_paths.append(existing[c.tur].yol)
            f = existing[c.tur]
            f.asl_nomi, f.yol, f.mime, f.hajm = c.upload.filename[:255], rel, c.mime, c.hajm
        else:
            a.fayllar.append(Fayl(tur=c.tur, asl_nomi=c.upload.filename[:255], yol=rel, mime=c.mime, hajm=c.hajm))
    return new_paths, old_paths


# ---------- endpointlar ----------
@router.post("", status_code=201, response_model=Yaratildi, summary="Yangi ariza yuborish")
def ariza_yaratish(
    data: str | None = Form(None, description="Ariza ma'lumotlari, JSON"),
    asosiy_chizma: UploadFile | None = File(None),
    tushuntirish_xati: UploadFile | None = File(None),
    tasdiqlovchi_hujjat: UploadFile | None = File(None),
    rol: str = Depends(get_rol),
    db: Session = Depends(get_db),
):
    require(rol, ARIZA_BERUVCHI)
    files = dict(asosiy_chizma=asosiy_chizma, tushuntirish_xati=tushuntirish_xati, tasdiqlovchi_hujjat=tasdiqlovchi_hujjat)
    parsed, checked = _validate(data, files, fayllar_majburiy=True)

    a = Ariza(holat=HOLAT_YUBORILGAN)
    _apply(a, parsed)
    db.add(a)
    db.flush()  # fayl papkasi uchun id kerak
    new_paths = []
    try:
        new_paths, _ = _save_files(db, a, checked)
        db.commit()
    except Exception:
        db.rollback()
        for p in new_paths:
            storage.remove(p)
        raise
    return Yaratildi(id=a.id, holat=a.holat)


@router.get("", response_model=ArizaRoyxat, summary="Arizalar ro'yxati")
def arizalar_royxati(
    holat: str | None = Query(None),
    hujjat_turi: str | None = Query(None),
    soato_kodi: str | None = Query(None),
    sahifa: int = Query(1, ge=1),
    hajm: int = Query(20, ge=1, le=100),
    rol: str = Depends(get_rol),
    db: Session = Depends(get_db),
):
    if holat and holat not in HOLATLAR:
        raise ValidationFailed({"holat": f"quyidagilardan biri: {', '.join(HOLATLAR)}"})
    stmt = select(Ariza)
    if holat:
        stmt = stmt.where(Ariza.holat == holat)
    if hujjat_turi:
        stmt = stmt.where(Ariza.hujjat_turi == hujjat_turi)
    if soato_kodi:
        stmt = stmt.where(Ariza.soato_kodi == soato_kodi)
    jami = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Ariza.id.desc()).offset((sahifa - 1) * hajm).limit(hajm)).all()
    return ArizaRoyxat(items=[ArizaQisqa(**_qisqa(a)) for a in rows], jami=jami)


@router.get("/{ariza_id}", response_model=ArizaToliq, summary="Arizani ko'rish")
def ariza_korish(ariza_id: int, request: Request, rol: str = Depends(get_rol), db: Session = Depends(get_db)):
    return _toliq(services.get_ariza(db, ariza_id), request)


@router.put("/{ariza_id}", response_model=ArizaToliq, summary="Qaytarilgan arizani tuzatib qayta yuborish")
def ariza_qayta_yuborish(
    ariza_id: int,
    request: Request,
    data: str | None = Form(None, description="Tuzatilgan ma'lumotlar, JSON (to'liq)"),
    asosiy_chizma: UploadFile | None = File(None),
    tushuntirish_xati: UploadFile | None = File(None),
    tasdiqlovchi_hujjat: UploadFile | None = File(None),
    rol: str = Depends(get_rol),
    db: Session = Depends(get_db),
):
    """Fayllar ixtiyoriy: yuborilganlari almashtiriladi, qolganlari avvalgidek qoladi."""
    require(rol, ARIZA_BERUVCHI)
    a = services.get_ariza(db, ariza_id, for_update=True)
    if a.holat != HOLAT_QAYTARILGAN:
        raise ApiError(409, f"Faqat qaytarilgan arizani qayta yuborish mumkin (hozirgi holat: {a.holat})")
    files = dict(asosiy_chizma=asosiy_chizma, tushuntirish_xati=tushuntirish_xati, tasdiqlovchi_hujjat=tasdiqlovchi_hujjat)
    parsed, checked = _validate(data, files, fayllar_majburiy=False)

    _apply(a, parsed)
    a.holat = HOLAT_YUBORILGAN
    new_paths, old_paths = [], []
    try:
        new_paths, old_paths = _save_files(db, a, checked)
        db.commit()
    except Exception:
        db.rollback()
        for p in new_paths:
            storage.remove(p)
        raise
    for p in old_paths:
        storage.remove(p)
    db.refresh(a)
    return _toliq(a, request)


@router.post(
    "/{ariza_id}/tasdiqlash",
    response_model=Tasdiqlandi,
    summary="Tasdiqlash: ID yaratish va chegarani ArcGIS'ga yozish",
    responses={409: {"description": "ID takrori yoki noto'g'ri holat"}, 502: {"description": "ArcGIS xatosi"}},
)
def ariza_tasdiqlash(
    ariza_id: int,
    rol: str = Depends(get_rol),
    db: Session = Depends(get_db),
    arcgis: ArcGISClient = Depends(get_arcgis),
):
    require(rol, TEKSHIRUVCHI)
    a = services.tasdiqlash(db, ariza_id, arcgis)
    return Tasdiqlandi(id_raqam=a.id_raqam, arcgis_object_id=a.arcgis_object_id)


@router.post("/{ariza_id}/qaytarish", response_model=ArizaToliq, summary="Arizani sabab bilan qaytarish")
def ariza_qaytarish(
    ariza_id: int,
    body: QaytarishSorov,
    request: Request,
    rol: str = Depends(get_rol),
    db: Session = Depends(get_db),
):
    require(rol, TEKSHIRUVCHI)
    return _toliq(services.qaytarish(db, ariza_id, body.sabab), request)


@router.get("/{ariza_id}/fayllar/{tur}", name="fayl_yuklab_olish", summary="Biriktirilgan faylni yuklab olish")
def fayl_yuklab_olish(ariza_id: int, tur: str, t: str | None = None, db: Session = Depends(get_db)):
    # Brauzer <a href> orqali ochadi (sarlavha yubora olmaydi), shuning uchun havola qisqa muddatli imzo bilan beriladi
    if not verify_file(t, ariza_id, tur):
        raise ApiError(403, "Havola muddati tugagan. Ariza sahifasini yangilab, qayta oching.")
    f = db.scalar(select(Fayl).where(Fayl.ariza_id == ariza_id, Fayl.tur == tur))
    if f is None:
        raise ApiError(404, "Fayl topilmadi")
    path = storage.full_path(f.yol)
    if not path.exists():
        raise ApiError(404, "Fayl diskda topilmadi")
    return FileResponse(path, media_type=f.mime, filename=f.asl_nomi)
