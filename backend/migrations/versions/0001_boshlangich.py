"""boshlang'ich jadvallar: arizalar, fayllar

Revision ID: 0001
Revises:
Create Date: 2026-10-15
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "arizalar",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hujjat_nomi", sa.String(255), nullable=False),
        sa.Column("hujjat_turi", sa.String(8), nullable=False),
        sa.Column("soato_kodi", sa.String(7), nullable=False),
        sa.Column("tasdiq_sanasi", sa.Date(), nullable=False),
        sa.Column("tasdiq_hujjati", sa.String(100), nullable=False),
        sa.Column("chegara", sa.JSON(), nullable=False),
        sa.Column("holat", sa.String(20), nullable=False),
        sa.Column("id_raqam", sa.String(40), nullable=True),
        sa.Column("arcgis_object_id", sa.Integer(), nullable=True),
        sa.Column("qaytarish_sababi", sa.Text(), nullable=True),
        sa.Column("yaratilgan", sa.DateTime(timezone=True), nullable=False),
        sa.Column("yangilangan", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("id_raqam", name="uq_arizalar_id_raqam"),
    )
    op.create_index("ix_arizalar_holat", "arizalar", ["holat"])
    op.create_index("ix_arizalar_hujjat_turi", "arizalar", ["hujjat_turi"])
    op.create_index("ix_arizalar_soato_kodi", "arizalar", ["soato_kodi"])

    op.create_table(
        "fayllar",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ariza_id", sa.Integer(), sa.ForeignKey("arizalar.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tur", sa.String(32), nullable=False),
        sa.Column("asl_nomi", sa.String(255), nullable=False),
        sa.Column("yol", sa.String(500), nullable=False),
        sa.Column("mime", sa.String(50), nullable=False),
        sa.Column("hajm", sa.Integer(), nullable=False),
        sa.UniqueConstraint("ariza_id", "tur", name="uq_fayl_ariza_tur"),
    )


def downgrade() -> None:
    op.drop_table("fayllar")
    op.drop_index("ix_arizalar_soato_kodi", "arizalar")
    op.drop_index("ix_arizalar_hujjat_turi", "arizalar")
    op.drop_index("ix_arizalar_holat", "arizalar")
    op.drop_table("arizalar")
