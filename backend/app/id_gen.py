from datetime import date

HUJJAT_TURLARI = ("БСХ", "ҲРС", "ТРЛ", "БР", "БРЛ", "ҚР", "ЛШ")


def make_id_raqam(hujjat_turi: str, soato_kodi: str, tasdiq_sanasi: date) -> str:
    """{hujjat_turi}-{soato_kodi}-{yil}, masalan БР-1703401-2026. Yil — tasdiq sanasi yili."""
    if hujjat_turi not in HUJJAT_TURLARI:
        raise ValueError(f"noma'lum hujjat turi: {hujjat_turi}")
    if len(soato_kodi) != 7 or not soato_kodi.isdigit():
        raise ValueError(f"SOATO kodi 7 raqamdan iborat bo'lishi kerak: {soato_kodi}")
    return f"{hujjat_turi}-{soato_kodi}-{tasdiq_sanasi.year}"


def make_description(id_raqam: str, hujjat_nomi: str, limit: int = 75) -> str:
    """ArcGIS description maydoni: "{id_raqam} | {hujjat_nomi}", 75 belgidan oshsa qisqartiriladi."""
    text = f"{id_raqam} | {hujjat_nomi}"
    return text if len(text) <= limit else text[: limit - 1] + "…"
