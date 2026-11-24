"""Aggregations for the home and stats screens."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Invoice, InvoiceStatus, Sale, SaleLine, User
from app.schemas.stats import DailyTotalOut, StatsSummaryOut, TopProductOut
from app.timeutil import (
    WEEKDAY_LABELS,
    day_bounds,
    month_bounds,
    today_bogota,
    week_bounds,
    week_monday,
)

Period = Literal["day", "week", "month"]
ZERO = Decimal("0")


def _period_bounds(
    period: Period, ref: date
) -> tuple[datetime, datetime, date, date]:
    if period == "day":
        start, end = day_bounds(ref)
        return start, end, ref, ref
    if period == "week":
        start, end = week_bounds(ref)
        monday = week_monday(ref)
        return start, end, monday, monday + timedelta(days=6)
    start, end = month_bounds(ref)
    from_date = ref.replace(day=1)
    # end is start of next month → last calendar day is the day before.
    to_date = (end.astimezone(start.tzinfo) - timedelta(seconds=1)).date()
    return start, end, from_date, to_date


def _previous_bounds(
    period: Period, from_date: date, to_date: date
) -> tuple[datetime, datetime]:
    del to_date  # used for clarity at call sites; day/week derive from from_date
    if period == "day":
        return day_bounds(from_date - timedelta(days=1))
    if period == "week":
        prev_end = from_date - timedelta(days=1)
        return week_bounds(prev_end)
    prev_last = from_date - timedelta(days=1)
    return month_bounds(prev_last)


def _sum_and_count(
    db: Session, business_id: object, start: datetime, end: datetime
) -> tuple[Decimal, int]:
    total, count = db.execute(
        select(func.coalesce(func.sum(Sale.total), 0), func.count(Sale.id)).where(
            Sale.business_id == business_id,
            Sale.sold_at >= start,
            Sale.sold_at < end,
        )
    ).one()
    return Decimal(str(total)), int(count)


def _invoice_counts(
    db: Session, business_id: object, start: datetime, end: datetime
) -> tuple[int, int]:
    total = db.scalar(
        select(func.count(Invoice.id))
        .join(Sale, Sale.id == Invoice.sale_id)
        .where(
            Invoice.business_id == business_id,
            Sale.sold_at >= start,
            Sale.sold_at < end,
        )
    )
    accepted = db.scalar(
        select(func.count(Invoice.id))
        .join(Sale, Sale.id == Invoice.sale_id)
        .where(
            Invoice.business_id == business_id,
            Sale.sold_at >= start,
            Sale.sold_at < end,
            Invoice.status == InvoiceStatus.ACCEPTED,
        )
    )
    return int(accepted or 0), int(total or 0)


def _daily_series(
    db: Session,
    business_id: object,
    from_date: date,
    to_date: date,
) -> list[DailyTotalOut]:
    rows: list[DailyTotalOut] = []
    day = from_date
    while day <= to_date:
        start, end = day_bounds(day)
        total, count = _sum_and_count(db, business_id, start, end)
        rows.append(
            DailyTotalOut(
                date=day,
                label=WEEKDAY_LABELS[day.weekday()],
                total=total,
                sale_count=count,
            )
        )
        day += timedelta(days=1)
    return rows


def get_summary(
    db: Session,
    user: User,
    *,
    period: Period = "day",
    on: date | None = None,
) -> StatsSummaryOut:
    ref = on or today_bogota()
    start, end, from_date, to_date = _period_bounds(period, ref)
    total, sale_count = _sum_and_count(db, user.business_id, start, end)
    prev_start, prev_end = _previous_bounds(period, from_date, to_date)
    previous_total, _ = _sum_and_count(db, user.business_id, prev_start, prev_end)
    invoices_accepted, invoices_total = _invoice_counts(
        db, user.business_id, start, end
    )
    average = (
        (total / sale_count).quantize(Decimal("1"))
        if sale_count
        else ZERO
    )
    daily: list[DailyTotalOut] = []
    if period == "week":
        daily = _daily_series(db, user.business_id, from_date, to_date)
    elif period == "day":
        daily = _daily_series(db, user.business_id, from_date, to_date)

    return StatsSummaryOut(
        period=period,
        from_date=from_date,
        to_date=to_date,
        total=total,
        sale_count=sale_count,
        average_ticket=average,
        previous_total=previous_total,
        invoices_accepted=invoices_accepted,
        invoices_total=invoices_total,
        daily=daily,
    )


def get_top_products(
    db: Session,
    user: User,
    *,
    period: Period = "day",
    on: date | None = None,
    limit: int = 3,
) -> list[TopProductOut]:
    ref = on or today_bogota()
    start, end, _, _ = _period_bounds(period, ref)
    rows = db.execute(
        select(
            SaleLine.product_name,
            SaleLine.unit,
            func.sum(SaleLine.quantity).label("qty"),
            func.sum(SaleLine.line_total).label("amount"),
        )
        .join(Sale, Sale.id == SaleLine.sale_id)
        .where(
            Sale.business_id == user.business_id,
            Sale.sold_at >= start,
            Sale.sold_at < end,
        )
        .group_by(SaleLine.product_name, SaleLine.unit)
        .order_by(func.sum(SaleLine.line_total).desc())
        .limit(limit)
    ).all()

    result: list[TopProductOut] = []
    for index, row in enumerate(rows, start=1):
        result.append(
            TopProductOut(
                rank=index,
                product_name=row.product_name,
                quantity=Decimal(str(row.qty)),
                unit=str(row.unit.value if hasattr(row.unit, "value") else row.unit),
                total=Decimal(str(row.amount)),
            )
        )
    return result
