from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = f"sqlite:///{BASE_DIR / 'shgat.db'}"
    upload_dir: Path = BASE_DIR / "uploads"
    soato_file: Path = BASE_DIR / "data" / "soato.json"

    arcgis_layer_url: str = "https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2"
    arcgis_timeout: float = 15.0  # soniya
    arcgis_retries: int = 3  # vaqtinchalik xatolarda jami urinishlar soni

    max_file_size: int = 20 * 1024 * 1024
    cors_origins: str = "http://localhost:5173"


settings = Settings()
