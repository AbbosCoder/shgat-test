from fastapi import Header

from app.config import settings
from app.errors import ApiError
from app.security import decode_access_token

ARIZA_BERUVCHI = "ariza_beruvchi"
TEKSHIRUVCHI = "tekshiruvchi"
ROLLAR = (ARIZA_BERUVCHI, TEKSHIRUVCHI)


def get_rol(
    authorization: str | None = Header(default=None),
    x_rol: str | None = Header(default=None, alias="X-Rol"),
) -> str:
    """Rol JWT tokendan olinadi: `Authorization: Bearer <token>`.

    Topshiriqdagi soddalashtirilgan `X-Rol` sarlavhasi faqat ALLOW_X_ROL=true bo'lganda qabul qilinadi
    (lokal ishlab chiqish va testlar). Production'da o'chiq.
    """
    if authorization and authorization.lower().startswith("bearer "):
        data = decode_access_token(authorization[7:].strip())
        if data is None or data.get("rol") not in ROLLAR:
            raise ApiError(401, "Sessiya muddati tugagan yoki token noto'g'ri. Qayta kiring.")
        return data["rol"]
    if settings.allow_x_rol and x_rol in ROLLAR:
        return x_rol
    raise ApiError(401, "Tizimga kiring")


def require(rol: str, *allowed: str) -> None:
    if rol not in allowed:
        raise ApiError(403, f"Bu amal faqat {' yoki '.join(allowed)} uchun")
