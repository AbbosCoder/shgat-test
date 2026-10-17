import threading
import time
from collections import defaultdict, deque
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_rol
from app.errors import ApiError
from app.models import Foydalanuvchi
from app.security import create_access_token, decode_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["autentifikatsiya"])


class LoginSorov(BaseModel):
    login: str
    parol: str


class FoydalanuvchiOut(BaseModel):
    login: str
    ism: str
    rol: str


class LoginJavob(BaseModel):
    token: str
    muddat: datetime
    foydalanuvchi: FoydalanuvchiOut


class _Limiter:
    """IP bo'yicha muvaffaqiyatsiz urinishlarni sanaydi (parol tanlab ko'rishdan himoya). Bitta jarayon uchun."""

    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def _clean(self, key: str, now: float) -> deque:
        q = self._hits[key]
        while q and now - q[0] > settings.login_window_seconds:
            q.popleft()
        return q

    def blocked(self, key: str) -> int:
        with self._lock:
            now = time.monotonic()
            q = self._clean(key, now)
            if len(q) >= settings.login_max_attempts:
                return int(settings.login_window_seconds - (now - q[0])) + 1
            return 0

    def fail(self, key: str) -> None:
        with self._lock:
            self._hits[key].append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


limiter = _Limiter()


@router.post("/login", response_model=LoginJavob, summary="Tizimga kirish (JWT token olish)")
def login(body: LoginSorov, request: Request, db: Session = Depends(get_db)):
    key = request.client.host if request.client else "?"
    wait = limiter.blocked(key)
    if wait:
        raise ApiError(429, f"Juda ko'p urinish. {wait // 60 + 1} daqiqadan keyin qayta urinib ko'ring.")

    user = db.scalar(select(Foydalanuvchi).where(Foydalanuvchi.login == body.login.strip().lower()))
    if user is None or not verify_password(body.parol, user.parol_hash):
        limiter.fail(key)
        # Login yoki parol — qaysi biri xato ekanini aytmaymiz (foydalanuvchilarni aniqlab bo'lmasin)
        raise ApiError(401, "Login yoki parol noto'g'ri", {"parol": "login yoki parol noto'g'ri"})

    limiter.reset(key)
    token, exp = create_access_token(user.login, user.rol)
    return LoginJavob(token=token, muddat=exp, foydalanuvchi=FoydalanuvchiOut(login=user.login, ism=user.ism, rol=user.rol))


@router.get("/me", response_model=FoydalanuvchiOut, summary="Joriy foydalanuvchi")
def me(request: Request, rol: str = Depends(get_rol), db: Session = Depends(get_db)):
    auth = request.headers.get("authorization", "")
    data = decode_access_token(auth[7:]) if auth.lower().startswith("bearer ") else None
    if data is None:  # X-Rol rejimi (lokal)
        return FoydalanuvchiOut(login=rol, ism=rol, rol=rol)
    user = db.scalar(select(Foydalanuvchi).where(Foydalanuvchi.login == data["sub"]))
    if user is None:
        raise ApiError(401, "Foydalanuvchi topilmadi")
    return FoydalanuvchiOut(login=user.login, ism=user.ism, rol=user.rol)
