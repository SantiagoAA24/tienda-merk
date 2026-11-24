from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Business, Iva, PriceType, Product, Role, Unit, User
from app.security import hash_password

DEFAULT_PASSWORD = "clave-segura-123"


def make_business(db: Session, name: str = "Tienda de prueba") -> Business:
    business = Business(name=name, nit="900000000-0")
    db.add(business)
    db.flush()
    return business


def make_user(
    db: Session,
    business: Business,
    *,
    username: str = "vendedor",
    role: Role = Role.SELLER,
    password: str = DEFAULT_PASSWORD,
    active: bool = True,
) -> User:
    user = User(
        business_id=business.id,
        name=username.capitalize(),
        username=username,
        password_hash=hash_password(password),
        role=role,
        active=active,
    )
    db.add(user)
    db.flush()
    return user


def make_product(db: Session, business: Business, **overrides: object) -> Product:
    values: dict[str, object] = {
        "business_id": business.id,
        "name": "Papa pastusa",
        "price_type": PriceType.WEIGHT,
        "price": Decimal("3200"),
        "unit": Unit.KILOGRAM,
        "iva": Iva.EXCLUDED,
    }
    values.update(overrides)
    product = Product(**values)
    db.add(product)
    db.flush()
    return product
