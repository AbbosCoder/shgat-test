#!/usr/bin/env bash
# Serverni BIR MARTA tayyorlash (Ubuntu 24.04). sudo bilan ishga tushiriladi:
#   sudo bash server-setup.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a

apt-get update -qq
apt-get install -y -qq python3-venv sqlite3 >/dev/null

# Xizmat uchun alohida, login qila olmaydigan foydalanuvchi
id shgat >/dev/null 2>&1 || useradd --system --home /var/lib/shgat --shell /usr/sbin/nologin shgat

install -d -o root -g root -m 755 /opt/shgat /opt/shgat/backend /opt/shgat/frontend
install -d -o shgat -g shgat -m 750 /var/lib/shgat /var/lib/shgat/uploads /var/lib/shgat/backups
install -d -o root -g shgat -m 750 /etc/shgat

[ -f /etc/shgat/shgat.env ] || install -o root -g shgat -m 640 "$HERE/shgat.env.example" /etc/shgat/shgat.env
[ -d /opt/shgat/venv ] || python3 -m venv /opt/shgat/venv

install -o root -g root -m 644 "$HERE/shgat.service" /etc/systemd/system/shgat.service
systemctl daemon-reload
systemctl enable shgat >/dev/null

# 8090 tashqaridan yopiq (ufw default deny); faqat Docker tarmoqlaridan (Caddy konteyneri) ruxsat
ufw allow from 172.16.0.0/12 to 172.17.0.1 port 8090 proto tcp comment 'shgat: Caddy -> uvicorn' >/dev/null

# Har kuni 03:30 da SQLite zaxira nusxasi, 14 kunlik
cat >/etc/cron.d/shgat-backup <<'CRON'
30 3 * * * shgat sqlite3 /var/lib/shgat/shgat.db ".backup /var/lib/shgat/backups/shgat-$(date +\%F).db" && find /var/lib/shgat/backups -name 'shgat-*.db' -mtime +14 -delete
CRON

echo "Server tayyor."
