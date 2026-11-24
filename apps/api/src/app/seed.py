"""Datos de ejemplo: negocio, usuario administrador y 10 productos.

Uso: SEED_ADMIN_PASSWORD=... uv run python -m app.seed
"""

import os
import sys
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, Iva, PriceType, Product, Role, Unit, User
from app.schemas.user import MIN_PASSWORD_LENGTH
from app.security import hash_password

BUSINESS_NAME = "Tienda Express Merk"
# TODO(contador): reemplazar por el NIT real del negocio.
BUSINESS_NIT = "000000000-0"

# TODO(contador): el IVA de cada producto es provisional; validarlo antes de facturar.
PRODUCTS: list[tuple[str, PriceType, str, Unit]] = [
    ("Papa pastusa", PriceType.WEIGHT, "3200", Unit.KILOGRAM),
    ("Tomate chonto", PriceType.WEIGHT, "4500", Unit.KILOGRAM),
    ("Cebolla cabezona", PriceType.WEIGHT, "1800", Unit.POUND),
    ("Plátano hartón", PriceType.WEIGHT, "3000", Unit.KILOGRAM),
    ("Arroz", PriceType.WEIGHT, "2800", Unit.POUND),
    ("Azúcar", PriceType.WEIGHT, "2600", Unit.POUND),
    ("Huevo AA", PriceType.FIXED, "600", Unit.UNIT),
    ("Leche entera 1 L", PriceType.FIXED, "4200", Unit.UNIT),
    ("Panela 500 g", PriceType.FIXED, "3500", Unit.UNIT),
    ("Aceite 1 L", PriceType.FIXED, "12900", Unit.UNIT),
]
PROVISIONAL_IVA = Iva.EXCLUDED


@dataclass(frozen=True)
class SeedResult:
    business: Business
    admin_created: bool
    products_created: int


def seed(
    db: Session, *, admin_username: str, admin_password: str, admin_name: str
) -> SeedResult:
    business = db.scalars(
        select(Business).where(Business.name == BUSINESS_NAME)
    ).one_or_none()
    if business is None:
        # TODO(contador): resolución de numeración (número, prefijo, rango, vigencia).
        business = Business(name=BUSINESS_NAME, nit=BUSINESS_NIT)
        db.add(business)
        db.flush()

    username = admin_username.strip().lower()
    admin_created = False
    if db.scalars(select(User).where(User.username == username)).one_or_none() is None:
        db.add(
            User(
                business_id=business.id,
                name=admin_name,
                username=username,
                password_hash=hash_password(admin_password),
                role=Role.ADMIN,
            )
        )
        admin_created = True

    existing = set(
        db.scalars(select(Product.name).where(Product.business_id == business.id))
    )
    created = 0
    for name, price_type, price, unit in PRODUCTS:
        if name in existing:
            continue
        db.add(
            Product(
                business_id=business.id,
                name=name,
                price_type=price_type,
                price=Decimal(price),
                unit=unit,
                iva=PROVISIONAL_IVA,
            )
        )
        created += 1

    db.flush()
    return SeedResult(business, admin_created, created)


def main() -> int:
    password = os.environ.get("SEED_ADMIN_PASSWORD", "")
    if len(password) < MIN_PASSWORD_LENGTH:
        print(
            "Falta SEED_ADMIN_PASSWORD (mínimo "
            f"{MIN_PASSWORD_LENGTH} caracteres) en las variables de entorno.",
            file=sys.stderr,
        )
        return 1

    from app.db import SessionLocal

    with SessionLocal() as db:
        result = seed(
            db,
            admin_username=os.environ.get("SEED_ADMIN_USERNAME", "admin"),
            admin_password=password,
            admin_name=os.environ.get("SEED_ADMIN_NAME", "Administrador"),
        )
        business_name = result.business.name
        db.commit()

    admin = "creado" if result.admin_created else "ya existía"
    print(
        f"Negocio: {business_name}. Administrador: {admin}. "
        f"Productos nuevos: {result.products_created}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
