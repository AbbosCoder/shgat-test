from fastapi import Header

from app.errors import ApiError

ARIZA_BERUVCHI = "ariza_beruvchi"
TEKSHIRUVCHI = "tekshiruvchi"


def get_rol(x_rol: str | None = Header(default=None, alias="X-Rol")) -> str:
    if x_rol not in (ARIZA_BERUVCHI, TEKSHIRUVCHI):
        raise ApiError(401, "X-Rol sarlavhasi kerak: ariza_beruvchi yoki tekshiruvchi")
    return x_rol


def require(rol: str, *allowed: str) -> None:
    if rol not in allowed:
        raise ApiError(403, f"Bu amal faqat {' yoki '.join(allowed)} uchun")
