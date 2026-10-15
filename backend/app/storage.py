"""Yuklangan fayllarni tekshirish va diskka xavfsiz saqlash."""

import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

FAYL_TURLARI = {
    "asosiy_chizma": "asosiy chizma",
    "tushuntirish_xati": "tushuntirish xati",
    "tasdiqlovchi_hujjat": "tasdiqlovchi hujjat",
}

# Kengaytmaga emas, faylning birinchi baytlariga qaraymiz — nomini o'zgartirilgan .exe o'tib ketmaydi
_SIGNATURES = (
    (b"%PDF-", "application/pdf", ".pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
)
_CHUNK = 1024 * 1024


@dataclass
class TekshirilganFayl:
    tur: str
    upload: UploadFile
    mime: str
    ext: str
    hajm: int


def check_upload(tur: str, upload: UploadFile | None) -> tuple[TekshirilganFayl | None, str | None]:
    """(fayl, xato) qaytaradi. Hajm oqim bilan o'lchanadi, butun fayl xotiraga o'qilmaydi."""
    if upload is None or not upload.filename:
        return None, "fayl biriktirilmagan"
    f = upload.file
    head = f.read(8)
    match = next(((mime, ext) for sig, mime, ext in _SIGNATURES if head.startswith(sig)), None)
    if match is None:
        return None, "faqat PDF, JPG yoki PNG fayl qabul qilinadi"
    f.seek(0, 2)
    size = f.tell()
    f.seek(0)
    if size > settings.max_file_size:
        mb = settings.max_file_size // (1024 * 1024)
        return None, f"fayl hajmi {mb} MB dan oshmasligi kerak ({size / 1024 / 1024:.1f} MB)"
    return TekshirilganFayl(tur, upload, match[0], match[1], size), None


def save(ariza_id: int, fayl: TekshirilganFayl) -> str:
    """Fayl foydalanuvchi bergan nom bilan emas, tasodifiy nom bilan saqlanadi (path traversal'dan himoya)."""
    folder = Path(settings.upload_dir) / str(ariza_id)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{fayl.tur}-{uuid.uuid4().hex}{fayl.ext}"
    target = folder / name
    with target.open("wb") as out:
        shutil.copyfileobj(fayl.upload.file, out, _CHUNK)
    return f"{ariza_id}/{name}"


def full_path(rel: str) -> Path:
    base = Path(settings.upload_dir).resolve()
    p = (base / rel).resolve()
    if base not in p.parents:
        raise ValueError("noto'g'ri yo'l")
    return p


def remove(rel: str) -> None:
    try:
        full_path(rel).unlink(missing_ok=True)
    except ValueError:
        pass
