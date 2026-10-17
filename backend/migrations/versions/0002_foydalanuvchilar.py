"""foydalanuvchilar jadvali (JWT autentifikatsiya)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-17
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "foydalanuvchilar",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("login", sa.String(50), nullable=False),
        sa.Column("ism", sa.String(100), nullable=False),
        sa.Column("rol", sa.String(20), nullable=False),
        sa.Column("parol_hash", sa.String(200), nullable=False),
        sa.Column("yaratilgan", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("login", name="uq_foydalanuvchilar_login"),
    )


def downgrade() -> None:
    op.drop_table("foydalanuvchilar")
