"""Day cash closing: expected = opening base + cash sales totals."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import CashClosing, Sale, User
from app.schemas.closing import ClosingCreate
from app.timeutil import day_bounds


def cash_sales_total(db: Session, business_id: object, closing_date: date) -> Decimal:
    start, end = day_bounds(closing_date)
    total = db.scalar(
        select(func.coalesce(func.sum(Sale.total), 0)).where(
            Sale.business_id == business_id,
            Sale.sold_at >= start,
            Sale.sold_at < end,
            Sale.payment_method == "cash",
        )
    )
    return Decimal(str(total or 0))


def create_closing(
    db: Session, user: User, body: ClosingCreate
) -> CashClosing:
    existing = db.scalars(
        select(CashClosing).where(
            CashClosing.business_id == user.business_id,
            CashClosing.closing_date == body.closing_date,
        )
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya hay un cierre para este día.",
        )

    cash_total = cash_sales_total(db, user.business_id, body.closing_date)
    expected = body.opening_cash + cash_total
    difference = body.counted_cash - expected

    row = CashClosing(
        business_id=user.business_id,
        user_id=user.id,
        closing_date=body.closing_date,
        opening_cash=body.opening_cash,
        expected_cash=expected,
        counted_cash=body.counted_cash,
        difference=difference,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya hay un cierre para este día.",
        ) from exc
    db.refresh(row)
    return row
