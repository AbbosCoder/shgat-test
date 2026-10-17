from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = f"sqlite:///{BASE_DIR / 'shgat.db'}"
    upload_dir: Path = BASE_DIR / "uploads"
    soato_file: Path = BASE_DIR / "data" / "soato.json"

    arcgis_layer_url: str = "https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2"
    arcgis_timeout: float = 15.0  # soniya
    arcgis_retries: int = 3  # vaqtinchalik xatolarda jami urinishlar soni

    max_file_size: int = 20 * 1024 * 1024
    cors_origins: str = "http://localhost:5173"

    # Production'da frontend'ning yig'ilgan fayllari (frontend/dist). Berilsa, API ularni ham beradi.
    frontend_dir: Path | None = None

    # --- Autentifikatsiya ---
    jwt_secret: str = "dev-secret-faqat-lokal-uchun-almashtiring"
    jwt_ttl_minutes: int = 8 * 60
    # Topshiriqdagi soddalashtirilgan X-Rol sarlavhasi: faqat lokal ishlab chiqish va testlar uchun
    allow_x_rol: bool = False
    # Bo'sh bazada avtomatik yaratiladigan hisoblar: "login:parol:rol:Ism,..." (lokal/Docker demo uchun)
    seed_users: str = ""
    login_max_attempts: int = 5
    login_window_seconds: int = 300


settings = Settings()
