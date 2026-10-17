"""Parol xeshlash (scrypt), JWT tokenlar va fayl havolalari uchun vaqtinchalik imzo."""

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

_ALG = "HS256"
_N, _R, _P = 2**14, 8, 1  # scrypt parametrlari (OWASP tavsiyasi darajasida)


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${_N}${_R}${_P}${_b64(salt)}${_b64(dk)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt, dk = stored.split("$")
        if algo != "scrypt":
            return False
        calc = hashlib.scrypt(password.encode(), salt=_unb64(salt), n=int(n), r=int(r), p=int(p), dklen=len(_unb64(dk)))
        return hmac.compare_digest(calc, _unb64(dk))  # vaqt bo'yicha hujumdan himoya
    except (ValueError, TypeError):
        return False


def create_access_token(login: str, rol: str) -> tuple[str, datetime]:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_ttl_minutes)
    token = jwt.encode({"sub": login, "rol": rol, "typ": "access", "exp": exp}, settings.jwt_secret, algorithm=_ALG)
    return token, exp


def decode_access_token(token: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[_ALG])
    except jwt.PyJWTError:
        return None
    return data if data.get("typ") == "access" else None


def sign_file(ariza_id: int, tur: str, minutes: int = 60) -> str:
    """<a href> sarlavha yubora olmaydi, shuning uchun fayl havolasi qisqa muddatli imzo bilan beriladi."""
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode({"f": f"{ariza_id}/{tur}", "typ": "file", "exp": exp}, settings.jwt_secret, algorithm=_ALG)


def verify_file(token: str | None, ariza_id: int, tur: str) -> bool:
    if not token:
        return False
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[_ALG])
    except jwt.PyJWTError:
        return False
    return data.get("typ") == "file" and data.get("f") == f"{ariza_id}/{tur}"
