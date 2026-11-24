"""Unique cash closing per business and date.

Revision ID: 20261124_0003
Revises: 20261123_0002
Create Date: 2026-11-24
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "20261124_0003"
down_revision: str | None = "20261123_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_cash_closings_business_date",
        "cash_closings",
        ["business_id", "closing_date"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_cash_closings_business_date",
        "cash_closings",
        type_="unique",
    )
