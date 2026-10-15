"""ArcGIS mijozining o'zi: javoblarni tekshirish, qayta urinish va takror obyekt yaratmaslik."""

import json
from urllib.parse import parse_qs

import httpx
import pytest

from app.arcgis import ArcGISClient, ArcGISError

GEOM = {"rings": [[[0, 0], [0, 1], [1, 1], [0, 0]]], "spatialReference": {"wkid": 102100}}
ATTRS = {"description": "БР-1703401-2026 | test", "symbolid": 0}


def make_client(handler, retries=3):
    return ArcGISClient(layer_url="https://arcgis.test/FS/2", retries=retries, transport=httpx.MockTransport(handler), backoff=0)


def test_add_success_reads_object_id():
    def handler(req: httpx.Request):
        if req.url.path.endswith("/query"):
            return httpx.Response(200, json={"features": []})
        body = parse_qs(req.content.decode())
        adds = json.loads(body["adds"][0])
        assert adds[0]["attributes"] == ATTRS
        assert body["f"] == ["json"]
        return httpx.Response(200, json={"addResults": [{"objectId": 42, "success": True}]})

    assert make_client(handler).add_feature_once(GEOM, ATTRS, "БР-1703401-2026 |") == 42


def test_add_success_false_raises():
    def handler(req):
        if req.url.path.endswith("/query"):
            return httpx.Response(200, json={"features": []})
        return httpx.Response(200, json={"addResults": [{"success": False, "error": {"description": "bad"}}]})

    with pytest.raises(ArcGISError, match="bad"):
        make_client(handler).add_feature_once(GEOM, ATTRS, "x")


def test_error_in_200_body_raises():
    def handler(req):
        return httpx.Response(200, json={"error": {"code": 400, "message": "Invalid parameters"}})

    with pytest.raises(ArcGISError, match="Invalid parameters"):
        make_client(handler).add_feature_once(GEOM, ATTRS, "x")


def test_timeout_is_retried_then_fails():
    calls = {"n": 0}

    def handler(req):
        calls["n"] += 1
        raise httpx.ReadTimeout("slow")

    with pytest.raises(ArcGISError, match="timeout"):
        make_client(handler, retries=3).add_feature_once(GEOM, ATTRS, "x")
    assert calls["n"] == 3


def test_lost_response_does_not_create_second_object():
    """1-urinish: obyekt yozildi, lekin javob yo'qoldi (timeout). 2-urinish: query uni topadi — qayta qo'shilmaydi."""
    state = {"stored": None, "adds": 0}

    def handler(req):
        if req.url.path.endswith("/query"):
            # server kirill harfini WHERE'da solishtira olmaydi — so'rovda faqat lotin qismi bo'lishi kerak
            assert req.url.params["where"] == "description LIKE '%-1703401-2026 |%'"
            feats = [{"attributes": {"objectid": state["stored"], "description": ATTRS["description"]}}] if state["stored"] else []
            return httpx.Response(200, json={"features": feats})
        state["adds"] += 1
        state["stored"] = 77
        raise httpx.ReadTimeout("javob yo'qoldi")

    assert make_client(handler).add_feature_once(GEOM, ATTRS, "БР-1703401-2026 |") == 77
    assert state["adds"] == 1


def test_server_error_then_success():
    state = {"n": 0}

    def handler(req):
        if req.url.path.endswith("/query"):
            return httpx.Response(200, json={"features": []})
        state["n"] += 1
        if state["n"] == 1:
            return httpx.Response(503)
        return httpx.Response(200, json={"addResults": [{"objectId": 5, "success": True}]})

    assert make_client(handler).add_feature_once(GEOM, ATTRS, "x") == 5


def test_find_ignores_other_type_with_same_soato_and_year():
    """'%-1703401-2026 |%' БР va ҚР ni ham topadi — aniq prefiks Python'da tekshiriladi."""

    def handler(req):
        return httpx.Response(200, json={"features": [{"attributes": {"objectid": 9, "description": "ҚР-1703401-2026 | boshqa"}}]})

    assert make_client(handler).find_by_description_prefix("БР-1703401-2026 |") is None
