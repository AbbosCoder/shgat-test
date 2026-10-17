import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.arcgis import ArcGISError, get_arcgis
from app.config import settings
from app.db import Base, get_db, make_engine
from app.main import app

PDF = b"%PDF-1.4\n%test\n"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32

VALID_DATA = {
    "hujjat_nomi": "Andijon shahri bosh rejasi",
    "hujjat_turi": "БР",
    "soato_kodi": "1703401",
    "tasdiq_sanasi": "2026-03-12",
    "tasdiq_hujjati": "123-son qaror",
    "chegara": {
        "type": "Polygon",
        "coordinates": [[[72.30, 40.75], [72.40, 40.75], [72.40, 40.81], [72.30, 40.81], [72.30, 40.75]]],
    },
}


class FakeArcGIS:
    """ArcGIS mock: qo'shilgan obyektlarni xotirada saqlaydi, kerak bo'lsa xato beradi."""

    def __init__(self):
        self.features: dict[int, dict] = {}
        self.next_id = 1000
        self.fail = False
        self.calls = 0

    def add_feature_once(self, geometry, attributes, dedupe_prefix):
        self.calls += 1
        if self.fail:
            raise ArcGISError("sinov uchun xato")
        for oid, f in self.features.items():
            if f["attributes"]["description"].startswith(dedupe_prefix):
                return oid
        self.next_id += 1
        self.features[self.next_id] = {"geometry": geometry, "attributes": attributes}
        return self.next_id


@pytest.fixture
def arcgis():
    return FakeArcGIS()


@pytest.fixture
def client(tmp_path, monkeypatch, arcgis):
    monkeypatch.setattr(settings, "upload_dir", tmp_path / "uploads")
    monkeypatch.setattr(settings, "allow_x_rol", True)  # eski testlar soddalashtirilgan X-Rol bilan
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_arcgis] = lambda: arcgis
    app.state.test_session = TestSession
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    engine.dispose()


ARIZA = {"X-Rol": "ariza_beruvchi"}
TEKSHIRUVCHI = {"X-Rol": "tekshiruvchi"}


def files(**override):
    f = {
        "asosiy_chizma": ("chizma.pdf", PDF, "application/pdf"),
        "tushuntirish_xati": ("xat.pdf", PDF, "application/pdf"),
        "tasdiqlovchi_hujjat": ("qaror.png", PNG, "image/png"),
    }
    f.update(override)
    return {k: v for k, v in f.items() if v is not None}


def yuborish(client, data=None, **file_override):
    payload = dict(VALID_DATA)
    payload.update(data or {})
    return client.post(
        "/api/arizalar",
        data={"data": json.dumps(payload, ensure_ascii=False)},
        files=files(**file_override),
        headers=ARIZA,
    )
