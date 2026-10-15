"""Ochiq ArcGIS Feature Service qatlami bilan ishlash (query, applyEdits).

Vaqtinchalik xatolarda (tarmoq, timeout, 5xx) so'rov qayta yuboriladi. Qo'shishdan oldin har safar
qatlam description bo'yicha qidiriladi: oldingi urinish aslida yozilgan-u, javobi kelmay qolgan bo'lsa,
ikkinchi obyekt yaratilmaydi — o'sha objectId qaytariladi.
"""

import json
import logging
import time

import httpx

from app.config import settings

log = logging.getLogger("arcgis")


class ArcGISError(Exception):
    """ArcGIS xato qaytardi yoki javob bermadi."""


class _Transient(Exception):
    pass


class ArcGISClient:
    def __init__(
        self,
        layer_url: str | None = None,
        timeout: float | None = None,
        retries: int | None = None,
        transport: httpx.BaseTransport | None = None,
        backoff: float = 0.5,
    ):
        self.layer_url = (layer_url or settings.arcgis_layer_url).rstrip("/")
        self.retries = max(1, retries or settings.arcgis_retries)
        self.backoff = backoff
        self._http = httpx.Client(timeout=timeout or settings.arcgis_timeout, transport=transport)

    # --- past darajadagi so'rov ---
    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.layer_url}/{path}"
        try:
            resp = self._http.request(method, url, **kwargs)
        except httpx.TimeoutException as e:
            raise _Transient(f"ArcGIS javob bermadi (timeout): {e}") from e
        except httpx.TransportError as e:
            raise _Transient(f"ArcGIS'ga ulanib bo'lmadi: {e}") from e
        if resp.status_code >= 500:
            raise _Transient(f"ArcGIS HTTP {resp.status_code}")
        if resp.status_code >= 400:
            raise ArcGISError(f"ArcGIS HTTP {resp.status_code}")
        try:
            data = resp.json()
        except ValueError as e:
            raise ArcGISError("ArcGIS JSON bo'lmagan javob qaytardi") from e
        # ArcGIS xatolarni ko'pincha HTTP 200 bilan, tanada {"error": {...}} ko'rinishida qaytaradi
        if isinstance(data, dict) and "error" in data:
            err = data["error"] or {}
            code = err.get("code")
            msg = f"ArcGIS xatosi {code}: {err.get('message')} {err.get('details') or ''}".strip()
            if isinstance(code, int) and code >= 500:
                raise _Transient(msg)
            raise ArcGISError(msg)
        return data

    def _with_retry(self, fn):
        last: Exception | None = None
        for attempt in range(1, self.retries + 1):
            try:
                return fn()
            except _Transient as e:
                last = e
                log.warning("ArcGIS urinish %s/%s muvaffaqiyatsiz: %s", attempt, self.retries, e)
                if attempt < self.retries:
                    time.sleep(self.backoff * 2 ** (attempt - 1))
        raise ArcGISError(str(last))

    # --- ommaviy amallar ---
    def find_by_description_prefix(self, prefix: str) -> int | None:
        # Namuna server WHERE ichidagi kirill harflarini solishtira olmaydi ('ҚР-...' hech narsa topmaydi),
        # shuning uchun serverdan prefiksning lotin qismi bo'yicha so'raymiz, aniq moslikni esa shu yerda tekshiramiz.
        ascii_tail = prefix
        for i in range(len(prefix) - 1, -1, -1):
            if not prefix[i].isascii():
                ascii_tail = prefix[i + 1 :]
                break
        safe = ascii_tail.replace("'", "''")
        data = self._request(
            "GET",
            "query",
            params={
                "where": f"description LIKE '%{safe}%'",
                "outFields": "objectid,description",
                "returnGeometry": "false",
                "f": "json",
            },
        )
        for f in data.get("features") or []:
            attrs = f.get("attributes") or {}
            if (attrs.get("description") or "").startswith(prefix):
                return attrs["objectid"]
        return None

    def add_feature(self, esri_geometry: dict, attributes: dict) -> int:
        adds = [{"geometry": esri_geometry, "attributes": attributes}]
        data = self._request("POST", "applyEdits", data={"f": "json", "adds": json.dumps(adds, ensure_ascii=False)})
        results = data.get("addResults") or []
        if not results:
            raise ArcGISError("ArcGIS javobida addResults yo'q")
        first = results[0]
        if not first.get("success") or first.get("objectId") is None:
            err = first.get("error") or {}
            raise ArcGISError(f"ArcGIS obyektni qo'shmadi: {err.get('description') or err}")
        return int(first["objectId"])

    def add_feature_once(self, esri_geometry: dict, attributes: dict, dedupe_prefix: str) -> int:
        """Obyektni bir marta qo'shadi: avval shu ID bilan obyekt borligini tekshiradi."""

        def attempt() -> int:
            existing = self.find_by_description_prefix(dedupe_prefix)
            if existing is not None:
                log.info("ArcGIS'da %s allaqachon bor (objectId=%s), qayta qo'shilmaydi", dedupe_prefix, existing)
                return existing
            return self.add_feature(esri_geometry, attributes)

        return self._with_retry(attempt)

    def get_feature(self, object_id: int) -> dict | None:
        data = self._with_retry(
            lambda: self._request(
                "GET",
                "query",
                params={"where": f"objectid={int(object_id)}", "outFields": "*", "returnGeometry": "true", "f": "json"},
            )
        )
        features = data.get("features") or []
        return features[0] if features else None


def get_arcgis() -> ArcGISClient:
    return ArcGISClient()
