"""Foydalanuvchilarni yaratish: CLI va bo'sh bazaga demo hisoblar."""

import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import ROLLAR
from app.models import Foydalanuvchi
from app.security import hash_password

log = logging.getLogger("users")


def upsert_user(db: Session, login: str, parol: str, rol: str, ism: str | None = None) -> Foydalanuvchi:
    login = login.strip().lower()
    if rol not in ROLLAR:
        raise ValueError(f"rol quyidagilardan biri: {', '.join(ROLLAR)}")
    if len(parol) < 8:
        raise ValueError("parol kamida 8 belgi bo'lsin")
    user = db.scalar(select(Foydalanuvchi).where(Foydalanuvchi.login == login))
    if user is None:
        user = Foydalanuvchi(login=login)
        db.add(user)
    user.ism = ism or login
    user.rol = rol
    user.parol_hash = hash_password(parol)
    db.commit()
    return user


def seed_users(db: Session) -> None:
    """SEED_USERS="login:parol:rol:Ism,..." — faqat baza bo'sh bo'lsa (Docker/lokal demo)."""
    if not settings.seed_users.strip() or db.scalar(select(func.count()).select_from(Foydalanuvchi)):
        return
    for item in settings.seed_users.split(","):
        parts = item.strip().split(":")
        if len(parts) >= 3:
            upsert_user(db, parts[0], parts[1], parts[2], parts[3] if len(parts) > 3 else None)
            log.info("Demo foydalanuvchi yaratildi: %s (%s)", parts[0], parts[2])
