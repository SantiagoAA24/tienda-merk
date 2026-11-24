import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import seed as seed_module
from app.models import PriceType, Product, Role, User
from app.security import verify_password
from app.seed import seed


def run_seed(db: Session, password: str = "clave-admin-123") -> seed_module.SeedResult:
    return seed(db, admin_username="Admin", admin_password=password, admin_name="Dueña")


def test_seed_creates_business_admin_and_products(db: Session) -> None:
    result = run_seed(db)

    assert result.admin_created is True
    assert result.products_created == 10
    admin = db.scalars(select(User).where(User.username == "admin")).one()
    assert admin.role is Role.ADMIN
    assert admin.business_id == result.business.id
    assert verify_password(admin.password_hash, "clave-admin-123")
    products = db.scalars(select(Product)).all()
    assert len(products) == 10
    by_type = {p.price_type for p in products}
    assert by_type == {PriceType.FIXED, PriceType.WEIGHT}
    assert all(p.price > 0 for p in products)


def test_seed_is_idempotent(db: Session) -> None:
    first = run_seed(db)
    second = run_seed(db, password="otra-clave-999")

    assert second.business.id == first.business.id
    assert second.admin_created is False
    assert second.products_created == 0
    assert len(db.scalars(select(Product)).all()) == 10
    admin = db.scalars(select(User).where(User.username == "admin")).one()
    assert verify_password(admin.password_hash, "clave-admin-123")


def test_seed_requires_admin_password_from_env(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)

    assert seed_module.main() == 1
    assert "SEED_ADMIN_PASSWORD" in capsys.readouterr().err
