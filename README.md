# Shaharsozlik hujjatlari reestri — test topshirig'i (full-stack)

Ariza beruvchi shaharsozlik hujjati haqida ariza yuboradi, tekshiruvchi uni tasdiqlaydi yoki qaytaradi.
Tasdiqlashda server ID raqam beradi va hujjat chegarasini Esri'ning ochiq namuna qatlamiga yozadi.

| Qism | Texnologiya |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, Alembic, httpx |
| Baza | PostgreSQL 16 (Docker) yoki SQLite (lokal ishga tushirish va testlar) |
| Frontend | React 19 + TypeScript, Vite, ArcGIS Maps SDK for JavaScript, React Hook Form + Zod |
| Testlar | pytest (57 ta), Vitest + Testing Library (23 ta) |

**Ishlab turgan versiya: https://shgat.abbostech.uz** (Swagger: https://shgat.abbostech.uz/docs)

## Ishga tushirish

### 1-usul: Docker (tavsiya etiladi)

```bash
docker compose up --build
```

- Interfeys: http://localhost:8080
- API va Swagger: http://localhost:8000/docs

PostgreSQL, API va frontend (nginx) bitta buyruq bilan ko'tariladi, migratsiyalar API ishga tushganda avtomatik qo'llanadi.

### 2-usul: Docker'siz

Backend (SQLite bilan, sozlash shart emas):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # ixtiyoriy
alembic upgrade head
uvicorn app.main:app --port 8000
```

Frontend (boshqa terminalda):

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 ni oching. `/api` so'rovlari Vite proxy orqali `localhost:8000` ga boradi.
Rol yuqori o'ng burchakdagi "Rol" tanlagichida almashtiriladi.

### Testlar

```bash
cd backend && pytest          # 57 ta test
cd frontend && npm test       # 23 ta test
```

## Serverga deploy (Docker'siz: systemd + reverse proxy)

Jonli versiya Ubuntu 24.04 serverda Docker'siz ishlaydi:

```
Internet → :443 Caddy (Let's Encrypt) → 172.17.0.1:8090 uvicorn (systemd: shgat.service) → SQLite
```

- **systemd xizmati** (`deploy/shgat.service`) — alohida `shgat` foydalanuvchisi nomidan ishlaydi, ishga tushishdan
  oldin migratsiyalarni qo'llaydi, yiqilsa qayta ko'tariladi. `ProtectSystem=strict`: xizmat faqat
  `/var/lib/shgat` ga yoza oladi, kod (`/opt/shgat`) uning uchun faqat o'qish uchun.
- **Tarmoq:** uvicorn faqat `docker0` manzilida (172.17.0.1) tinglaydi. Serverdagi mavjud reverse proxy (Caddy,
  Docker konteynerda) shu manzil orqali ulanadi; `ufw` da 8090 faqat Docker tarmoqlari uchun ochiq, tashqaridan yopiq.
- **HTTPS** — Caddy sertifikatni Let's Encrypt'dan avtomatik oladi va yangilaydi. Uvicorn `--proxy-headers` bilan
  ishlaydi, shuning uchun fayl havolalari `https://` bilan yasaladi. Nginx bilan ham xuddi shu sxema ishlaydi
  (`proxy_pass http://172.17.0.1:8090;` + certbot).
- **Frontend** — `npm run build` natijasini backend o'zi beradi (`FRONTEND_DIR`), alohida web-server shart emas.
- **Zaxira** — har kuni cron orqali SQLite nusxasi (`sqlite3 .backup`), 14 kun saqlanadi.

Fayllar:

| Fayl | Vazifasi |
|---|---|
| `deploy/server-setup.sh` | Serverni bir marta tayyorlash: foydalanuvchi, papkalar, venv, systemd, ufw, cron |
| `deploy/deploy.sh` | Yangilash: frontend build → yuklash → `pip install` → `systemctl restart` → health check |
| `deploy/shgat.service` | systemd unit |
| `deploy/shgat.env.example` | Serverdagi sozlamalar namunasi (`/etc/shgat/shgat.env`) |

Yangilash bitta buyruq bilan:

```bash
./deploy/deploy.sh          # ~/.ssh/config dagi host nomi: DEPLOY_HOST=... bilan o'zgartiriladi
```

Kuzatish: `systemctl status shgat`, `journalctl -u shgat -f`.

## Sozlamalar (`backend/.env`)

| O'zgaruvchi | Standart qiymat | Izoh |
|---|---|---|
| `DATABASE_URL` | `sqlite:///backend/shgat.db` | PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |
| `UPLOAD_DIR` | `backend/uploads` | Yuklangan fayllar |
| `ARCGIS_LAYER_URL` | `.../Wildfire/FeatureServer/2` | Ochiq test qatlami |
| `ARCGIS_TIMEOUT` | `15` | Bitta so'rov uchun vaqt chegarasi, soniya |
| `ARCGIS_RETRIES` | `3` | Vaqtinchalik xatolarda jami urinishlar |
| `CORS_ORIGINS` | `http://localhost:5173` | Vergul bilan ajratiladi |
| `FRONTEND_DIR` | — | Berilsa, backend yig'ilgan frontend fayllarini ham beradi (production) |

Frontend uchun: `VITE_API_URL` — backend manzili (bo'sh bo'lsa, proxy ishlatiladi).

## Tuzilma

```
backend/app/
  routers/arizalar.py  7 ta endpoint + fayl yuklab olish
  services.py          tasdiqlash / qaytarish oqimi (HTTP'dan mustaqil)
  schemas.py           ariza ma'lumotlarini tekshirish (barcha xatolar bir yo'la)
  geo.py               chegara tekshiruvi, 4326 → 3857, GeoJSON → Esri JSON
  id_gen.py            ID generatori va description
  arcgis.py            ArcGIS REST mijozi: query, applyEdits, timeout, retry
  storage.py           fayllarni tekshirish (magic bytes, hajm) va saqlash
  errors.py            yagona xato formati {"xato", "maydonlar"}
backend/migrations/    Alembic
frontend/src/
  pages/               Ro'yxat, ariza shakli (yangi/tahrir), ariza sahifasi
  components/          ChegaraEditor (Sketch + GeoJSON), ChegaraMap (FeatureLayer), ...
  lib/                 api, zod sxema, geometriya yordamchilari
```

## Muhim qarorlar

**Tasdiqlash tartibi.** Ariza qatori qulflanadi (`SELECT ... FOR UPDATE`), holat tekshiriladi, ID yasaladi va
uning bandligi tekshiriladi, keyin ArcGIS'ga yoziladi, eng oxirida baza saqlanadi. ArcGIS xato bersa,
bazada hech narsa o'zgarmaydi: holat `yuborilgan` qoladi, ID saqlanmaydi, javob `502`.

**Takror ID.** ID bazada `UNIQUE`. Tasdiqlashdan oldin tekshiriladi (tushunarli `409`), parallel so'rov holatida
esa `IntegrityError` ham `409` ga aylanadi.

**Qayta urinishda ikkinchi obyekt yaratilmaydi.** `applyEdits` so'rovi ArcGIS'da bajarilib, javobi yo'qolishi
mumkin (timeout). Shuning uchun har bir qo'shishdan oldin qatlam `description` bo'yicha qidiriladi: shu ID
bilan obyekt bor bo'lsa, uning `objectId` si olinadi. Bu tekshiruvchi "Tasdiqlash"ni qayta bosganda ham,
mijozning ichki retry'ida ham ishlaydi.

**Kirill harflari va ArcGIS so'rovi.** Namuna server `WHERE` ichidagi kirill harflarini solishtira olmaydi:
`description LIKE 'ҚР-1703401-2025 |%'` hech narsa topmaydi. Shuning uchun so'rov ID'ning lotin qismi bo'yicha
yuboriladi (`LIKE '%-1703401-2025 |%'`), aniq moslik esa Python'da tekshiriladi.

**Koordinatalar.** 4326 → 3857 sferik Mercator formulasi bilan o'tkaziladi. Natija Esri'ning
`GeometryServer/project` xizmati bilan solishtirilgan (testda shu qiymatlar). Esri'da tashqi halqa soat mili
bo'yicha, teshiklar teskari: har bir halqaning yo'nalishi shoelace formulasi bilan tekshirilib, kerak bo'lsa
aylantiriladi. MultiPolygon'ning barcha halqalari bitta `rings` ga tushadi.

**Fayllar.** Turi kengaytma bo'yicha emas, birinchi baytlar (PDF/PNG/JPEG imzosi) bo'yicha aniqlanadi.
Diskka tasodifiy nom bilan saqlanadi (path traversal'dan himoya), yuklab olishda yo'l `UPLOAD_DIR` dan
chiqmasligi tekshiriladi.

**Validatsiya.** Backend barcha xatolarni bitta `422` javobda maydon nomlari bilan qaytaradi. Frontend xuddi
shu qoidalarni Zod bilan tekshiradi va serverdan kelgan `maydonlar` ni ham tegishli maydon yoniga qo'yadi.

## Bajarilgan ishlar

Backend (6.1):
- [x] `POST /api/arizalar` — multipart, 4-bo'lim qoidalari, fayllar diskka, yozuv bazaga
- [x] Chegara tekshiruvi: turi, yopiq halqa, kamida 4 nuqta, O'zbekiston hududi
- [x] ID generatori — alohida funksiya, bazada unique cheklov, takrorda `409`
- [x] ArcGIS'ga yozish: GeoJSON → Web Mercator → Esri JSON (halqa yo'nalishi bilan) → `applyEdits`
- [x] ArcGIS xatosi: holat o'zgarmaydi, ID saqlanmaydi, `502`; qayta urinishda ikkinchi obyekt yaratilmaydi
- [x] Ro'yxat (filtr, sahifalash), ko'rish, qaytarish, qayta yuborish — holat o'tishlari sxemaga mos
- [x] Unit testlar: ID generatori, chegara tekshiruvi, koordinata o'tkazish, tasdiqlash oqimi (ArcGIS mock)
- [x] README

Frontend (7.1):
- [x] Ariza shakli, har bir maydon yonida xato, tur va SOATO ro'yxatdan
- [x] Chegara: GeoJSON fayl yuklash yoki Sketch bilan chizish, xaritaga yaqinlashtirish, O'zbekistondan tashqarida ogohlantirish
- [x] 3 ta fayl: tur va hajm tekshiruvi, yuklash jarayoni ko'rsatkichi
- [x] Bo'lajak ID (faqat o'qish uchun), maydon o'zgarsa yangilanadi
- [x] Ro'yxat: jadval, holat va tur filtri, sahifalash, filtrlar URL'da
- [x] Ariza sahifasi: hisobga olingan hujjat chegarasi ochiq qatlamdan FeatureLayer + `objectid` filtri bilan
- [x] Tekshiruvchi: Tasdiqlash / Qaytarish (sabab majburiy), `409` va `502` oddiy tilda, rol almashtirgich
- [x] README

Qo'shimcha:
- [x] Docker Compose (PostgreSQL + API + frontend)
- [x] OpenAPI/Swagger (`/docs`)
- [x] ArcGIS so'rovlarida timeout va qayta urinish (eksponensial kutish)
- [x] Komponent testlari (Vitest + Testing Library)
- [x] Mobil ekranda moslashuvchan ko'rinish

## Bajarilmagan / cheklovlar

- 3 ish kunlik muddat hisoblash, JWT rollar, Calcite komponentlari, lotin/kirill almashtirish — qilinmadi.
- Frontend haqiqiy backend'ga ulangan; alohida mock API (MSW) qo'shilmadi.
- `data/soato.json` — namuna ro'yxat (viloyat markazlari). Rasmiy SOATO fayli berilsa, shu fayl almashtiriladi.
- ArcGIS Maps SDK 5.x da `Sketch` vidjeti "deprecated" (web komponentga o'tish rejalashtirilgan), lekin topshiriqda
  aynan Sketch vidjeti so'ralgani uchun shu ishlatildi.
- Asos xarita — `osm`, API kalit kerak emas.

## Sarflangan vaqt

_To'ldiriladi._
