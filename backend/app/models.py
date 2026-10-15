from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

HOLAT_YUBORILGAN = "yuborilgan"
HOLAT_HISOBGA_OLINGAN = "hisobga_olingan"
HOLAT_QAYTARILGAN = "qaytarilgan"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Ariza(Base):
    __tablename__ = "arizalar"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hujjat_nomi: Mapped[str] = mapped_column(String(255))
    hujjat_turi: Mapped[str] = mapped_column(String(8), index=True)
    soato_kodi: Mapped[str] = mapped_column(String(7), index=True)
    tasdiq_sanasi: Mapped[date] = mapped_column(Date)
    tasdiq_hujjati: Mapped[str] = mapped_column(String(100))
    chegara: Mapped[dict] = mapped_column(JSON)

    holat: Mapped[str] = mapped_column(String(20), default=HOLAT_YUBORILGAN, index=True)
    # NULL bir nechta bo'lishi mumkin, qiymat esa yagona — takroriy ID'ni baza darajasida to'sadi
    id_raqam: Mapped[str | None] = mapped_column(String(40), unique=True)
    arcgis_object_id: Mapped[int | None] = mapped_column(Integer)
    qaytarish_sababi: Mapped[str | None] = mapped_column(Text)

    yaratilgan: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    yangilangan: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    fayllar: Mapped[list["Fayl"]] = relationship(back_populates="ariza", cascade="all, delete-orphan", lazy="selectin")


class Fayl(Base):
    __tablename__ = "fayllar"
    __table_args__ = (UniqueConstraint("ariza_id", "tur", name="uq_fayl_ariza_tur"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ariza_id: Mapped[int] = mapped_column(ForeignKey("arizalar.id", ondelete="CASCADE"))
    tur: Mapped[str] = mapped_column(String(32))
    asl_nomi: Mapped[str] = mapped_column(String(255))
    yol: Mapped[str] = mapped_column(String(500))
    mime: Mapped[str] = mapped_column(String(50))
    hajm: Mapped[int] = mapped_column(Integer)

    ariza: Mapped[Ariza] = relationship(back_populates="fayllar")
