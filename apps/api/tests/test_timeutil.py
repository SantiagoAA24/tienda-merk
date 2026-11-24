from datetime import date, datetime

from app.timeutil import day_bounds, week_bounds, week_monday


def test_day_bounds_use_bogota() -> None:
    start, end = day_bounds(date(2026, 11, 21))
    assert start.isoformat() == "2026-11-21T00:00:00-05:00"
    assert end.isoformat() == "2026-11-22T00:00:00-05:00"


def test_week_bounds_monday_to_sunday() -> None:
    # 2026-11-21 is Saturday → week starts Monday 16.
    assert week_monday(date(2026, 11, 21)) == date(2026, 11, 16)
    start, end = week_bounds(date(2026, 11, 21))
    assert start == datetime.fromisoformat("2026-11-16T00:00:00-05:00")
    assert end == datetime.fromisoformat("2026-11-23T00:00:00-05:00")
