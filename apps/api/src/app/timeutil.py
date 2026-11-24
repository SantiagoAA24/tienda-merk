"""Calendar helpers for Colombia (America/Bogota)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

BOGOTA = ZoneInfo("America/Bogota")

# Monday = 0 … Sunday = 6 (ISO weekday - 1).
WEEKDAY_LABELS = ("L", "M", "M", "J", "V", "S", "D")


def now_bogota() -> datetime:
    return datetime.now(tz=BOGOTA)


def today_bogota() -> date:
    return now_bogota().date()


def day_bounds(day: date) -> tuple[datetime, datetime]:
    """Inclusive calendar day in Bogota → half-open UTC-aware datetimes."""
    start = datetime.combine(day, time.min, tzinfo=BOGOTA)
    end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=BOGOTA)
    return start, end


def week_monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def week_bounds(day: date) -> tuple[datetime, datetime]:
    monday = week_monday(day)
    start, _ = day_bounds(monday)
    _, end = day_bounds(monday + timedelta(days=6))
    return start, end


def month_bounds(day: date) -> tuple[datetime, datetime]:
    start_day = day.replace(day=1)
    if start_day.month == 12:
        next_month = start_day.replace(year=start_day.year + 1, month=1)
    else:
        next_month = start_day.replace(month=start_day.month + 1)
    start, _ = day_bounds(start_day)
    end, _ = day_bounds(next_month)
    return start, end
