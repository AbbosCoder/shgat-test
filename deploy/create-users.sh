#!/usr/bin/env bash
# Serverda hisob yaratish. Parollar shu yerning o'zida tasodifiy yaratiladi va faqat root o'qiy oladigan
# /etc/shgat/credentials.txt fayliga yoziladi — terminalga, log'ga yoki git'ga chiqmaydi.
#   sudo bash create-users.sh "login:rol:Ism Familiya" ...
set -euo pipefail
CRED=/etc/shgat/credentials.txt
touch "$CRED" && chmod 600 "$CRED" && chown root:root "$CRED"
set -a; . /etc/shgat/shgat.env; set +a
cd /opt/shgat/backend
for spec in "$@"; do
  IFS=: read -r login rol ism <<<"$spec"
  pass="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-14)"
  SHGAT_PASSWORD="$pass" sudo -E -u shgat /opt/shgat/venv/bin/python -m app.cli create-user "$login" "$rol" --ism "$ism" >/dev/null
  sed -i "/^$login /d" "$CRED"
  printf '%s %s %s\n' "$login" "$pass" "$rol" >> "$CRED"
  echo "yaratildi: $login ($rol)"
done
echo "Parollar: sudo cat $CRED"
