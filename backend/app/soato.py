import json
from functools import lru_cache

from app.config import settings


@lru_cache
def soato_list() -> list[dict]:
    with open(settings.soato_file, encoding="utf-8") as f:
        return json.load(f)


@lru_cache
def soato_map() -> dict[str, str]:
    return {item["kod"]: item["nomi"] for item in soato_list()}
