from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.errors import ApiError
from app.security import decode_access_token

ARIZA_BERUVCHI = "ariza_beruvchi"
TEKSHIRUVCHI = "tekshiruvchi"
ROLLAR = (ARIZA_BERUVCHI, TEKSHIRUVCHI)

# Swagger'da "Authorize" tugmasi shundan paydo bo'ladi; auto_error=False — xatoni o'zimiz yagona formatda qaytaramiz
bearer = HTTPBearer(auto_error=False, description="POST /api/auth/login javobidagi token")


def get_rol(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    x_rol: str | None = Header(default=None, alias="X-Rol", include_in_schema=False),
) -> str:
    """Rol JWT tokendan olinadi: `Authorization: Bearer <token>`.

    Topshiriqdagi soddalashtirilgan `X-Rol` sarlavhasi faqat ALLOW_X_ROL=true bo'lganda qabul qilinadi
    (lokal ishlab chiqish va testlar). Production'da o'chiq va API hujjatida ko'rsatilmaydi.
    """
    if creds is not None:
        data = decode_access_token(creds.credentials)
        if data is None or data.get("rol") not in ROLLAR:
            raise ApiError(401, "Sessiya muddati tugagan yoki token noto'g'ri. Qayta kiring.")
        return data["rol"]
    if settings.allow_x_rol and x_rol in ROLLAR:
        return x_rol
    raise ApiError(401, "Tizimga kiring")


def require(rol: str, *allowed: str) -> None:
    if rol not in allowed:
        raise ApiError(403, f"Bu amal faqat {' yoki '.join(allowed)} uchun")
