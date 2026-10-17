"""Foydalanuvchi yaratish yoki parolini almashtirish.

    python -m app.cli create-user <login> <rol> [--ism "Ism Familiya"]

Parol so'raladi (ekranda ko'rinmaydi) yoki SHGAT_PASSWORD muhit o'zgaruvchisidan olinadi.
"""

import argparse
import getpass
import os
import sys

from app.db import SessionLocal
from app.users import upsert_user


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m app.cli")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create-user", help="foydalanuvchi yaratish yoki parolini yangilash")
    c.add_argument("login")
    c.add_argument("rol", choices=["ariza_beruvchi", "tekshiruvchi"])
    c.add_argument("--ism")
    args = p.parse_args(argv)

    parol = os.environ.get("SHGAT_PASSWORD") or getpass.getpass("Parol: ")
    with SessionLocal() as db:
        try:
            u = upsert_user(db, args.login, parol, args.rol, args.ism)
        except ValueError as e:
            print(f"Xato: {e}", file=sys.stderr)
            return 1
    print(f"Tayyor: {u.login} ({u.rol})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
