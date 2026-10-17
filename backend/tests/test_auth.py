import pytest

from app.config import settings
from app.routers.auth import limiter
from app.security import hash_password, verify_password
from app.users import upsert_user
from tests.conftest import yuborish


@pytest.fixture
def users(client, monkeypatch):
    monkeypatch.setattr(settings, "allow_x_rol", False)  # production rejimi
    limiter._hits.clear()
    from app.main import app

    with app.state.test_session() as db:
        upsert_user(db, "ali", "ali-parol-123", "ariza_beruvchi", "Ali Valiyev")
        upsert_user(db, "tekshir", "tekshir-parol-1", "tekshiruvchi")
    return client


def login(c, user, parol):
    return c.post("/api/auth/login", json={"login": user, "parol": parol})


def bearer(c, user, parol):
    return {"Authorization": f"Bearer {login(c, user, parol).json()['token']}"}


def test_password_hash_roundtrip():
    h = hash_password("maxfiy-parol")
    assert h.startswith("scrypt$") and "maxfiy-parol" not in h
    assert verify_password("maxfiy-parol", h)
    assert not verify_password("boshqa", h)


def test_login_ok_returns_role(users):
    r = login(users, "ALI", "ali-parol-123")  # login katta-kichik harfga sezgir emas
    assert r.status_code == 200
    body = r.json()
    assert body["foydalanuvchi"] == {"login": "ali", "ism": "Ali Valiyev", "rol": "ariza_beruvchi"}
    assert body["token"].count(".") == 2


def test_login_wrong_password(users):
    r = login(users, "ali", "xato")
    assert r.status_code == 401
    assert r.json()["xato"] == "Login yoki parol noto'g'ri"


def test_login_rate_limited(users):
    for _ in range(settings.login_max_attempts):
        login(users, "ali", "xato")
    r = login(users, "ali", "ali-parol-123")  # to'g'ri parol ham bloklangan
    assert r.status_code == 429


def test_x_rol_rejected_in_production(users):
    assert users.get("/api/arizalar", headers={"X-Rol": "tekshiruvchi"}).status_code == 401


def test_bad_token_rejected(users):
    r = users.get("/api/arizalar", headers={"Authorization": "Bearer buzilgan.token.qiymat"})
    assert r.status_code == 401


def test_role_comes_from_token(users):
    ariza = bearer(users, "ali", "ali-parol-123")
    tekshir = bearer(users, "tekshir", "tekshir-parol-1")
    assert users.get("/api/auth/me", headers=ariza).json()["rol"] == "ariza_beruvchi"
    assert users.post("/api/arizalar/1/tasdiqlash", headers=ariza).status_code == 403
    assert users.get("/api/arizalar", headers=tekshir).status_code == 200


def test_file_link_requires_signature(users, monkeypatch):
    monkeypatch.setattr(settings, "allow_x_rol", True)
    aid = yuborish(users).json()["id"]
    monkeypatch.setattr(settings, "allow_x_rol", False)
    a = users.get(f"/api/arizalar/{aid}", headers=bearer(users, "ali", "ali-parol-123")).json()
    signed = a["fayllar"][0]["url"]
    assert users.get(signed).status_code == 200
    assert users.get(signed.split("?")[0]).status_code == 403
    assert users.get(signed.split("?")[0] + "?t=boshqa").status_code == 403
