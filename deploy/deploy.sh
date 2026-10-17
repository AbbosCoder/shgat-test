#!/usr/bin/env bash
# Loyihani serverga yangilab qo'yish. Lokal kompyuterdan ishga tushiriladi:
#   ./deploy/deploy.sh            (standart host: vidzo — ~/.ssh/config dagi nom)
#   DEPLOY_HOST=boshqa ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${DEPLOY_HOST:-vidzo}"

echo "→ frontend yig'ilmoqda"
(cd frontend && npm ci --silent && npm run build --silent)

echo "→ fayllar yuklanmoqda ($HOST)"
ssh "$HOST" "rm -rf /tmp/shgat-deploy && mkdir -p /tmp/shgat-deploy"
tar czf - \
  --exclude=.venv --exclude=__pycache__ --exclude=.pytest_cache --exclude='*.db' --exclude=uploads --exclude=.env \
  backend frontend/dist deploy \
  | ssh "$HOST" "tar xzf - -C /tmp/shgat-deploy"

echo "→ serverda o'rnatilmoqda"
ssh "$HOST" 'sudo bash -s' <<'REMOTE'
set -euo pipefail
S=/tmp/shgat-deploy
[ -d /opt/shgat/venv ] || bash $S/deploy/server-setup.sh
# Kod (root egasi, xizmat faqat o'qiydi) — eski fayllar qolib ketmasligi uchun to'liq almashtiriladi
rsync -a --delete $S/backend/ /opt/shgat/backend/
rsync -a --delete $S/frontend/dist/ /opt/shgat/frontend/
install -o root -g root -m 644 $S/deploy/shgat.service /etc/systemd/system/shgat.service
/opt/shgat/venv/bin/pip install -q --upgrade pip
/opt/shgat/venv/bin/pip install -q -r /opt/shgat/backend/requirements.txt
systemctl daemon-reload
systemctl restart shgat
for i in $(seq 1 20); do
  curl -fsS http://172.17.0.1:8090/api/health >/dev/null 2>&1 && break
  sleep 1
done
systemctl --no-pager --lines=0 status shgat | head -3
curl -fsS http://172.17.0.1:8090/api/health && echo
REMOTE
echo "✓ tayyor"
