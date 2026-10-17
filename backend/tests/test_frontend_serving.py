from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import mount_frontend


def test_spa_serves_files_and_falls_back_to_index(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<html>spa</html>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "favicon.svg").write_text("<svg/>")
    app = FastAPI()
    mount_frontend(app, tmp_path)
    c = TestClient(app)

    assert c.get("/assets/app.js").text == "console.log(1)"
    assert c.get("/favicon.svg").text == "<svg/>"
    assert c.get("/arizalar/5/tahrir").text == "<html>spa</html>"  # React Router yo'li
    assert c.get("/../secret").text == "<html>spa</html>"  # papkadan chiqib bo'lmaydi
    assert c.get("/api/yoq").status_code == 404
