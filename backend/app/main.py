import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import get_rol
from app.errors import register_error_handlers
from app.routers import arizalar
from app.schemas import Soato
from app.soato import soato_list

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Shaharsozlik hujjatlari reestri",
    description="Shaharsozlik hujjatlari arizalarini qabul qilish, tasdiqlash va chegarani ArcGIS qatlamiga yozish. "
    "Har bir so'rovda `X-Rol: ariza_beruvchi` yoki `X-Rol: tekshiruvchi` sarlavhasi yuboriladi.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(arizalar.router)


@app.get("/api/soato", response_model=list[Soato], tags=["ma'lumotnomalar"], summary="SOATO ro'yxati")
def soato(_: str = Depends(get_rol)):
    return soato_list()


@app.get("/api/health", include_in_schema=False)
def health():
    return {"ok": True}
