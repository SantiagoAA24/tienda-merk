import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Product, Role
from app.models.enums import PriceType, Unit
from app.schemas.product import WEIGHT_UNITS, ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def _forbid_seller_cost(*, role: Role, cost_provided: bool) -> None:
    if role == Role.SELLER and cost_provided:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver o editar el costo.",
        )


def _serialize(product: Product, role: Role) -> dict[str, object]:
    data = ProductOut.model_validate(product).model_dump(mode="json")
    if role == Role.SELLER:
        data.pop("cost", None)
    return data


def _resolve_unit(
    price_type: PriceType,
    unit: Unit | None,
    *,
    existing_unit: Unit | None = None,
) -> Unit:
    if price_type == PriceType.WEIGHT:
        resolved = unit if unit is not None else existing_unit
        if resolved is None or resolved not in WEIGHT_UNITS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Los productos por peso deben usar unidad g, kg o lb.",
            )
        return resolved
    if unit is not None and unit != Unit.UNIT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Los productos de precio fijo deben usar la unidad und.",
        )
    return Unit.UNIT


def _get_owned_product(
    db: DbSession, product_id: uuid.UUID, user: CurrentUser
) -> Product:
    product = db.get(Product, product_id)
    if product is None or product.business_id != user.business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )
    return product


@router.get("")
def list_products(
    user: CurrentUser,
    db: DbSession,
    price_type: PriceType | None = None,
    q: str | None = Query(default=None, max_length=120),
) -> list[dict[str, object]]:
    stmt = (
        select(Product)
        .where(
            Product.business_id == user.business_id,
            Product.active.is_(True),
        )
        .order_by(Product.name)
    )
    if price_type is not None:
        stmt = stmt.where(Product.price_type == price_type)
    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q.strip()}%"))

    products = db.scalars(stmt).all()
    return [_serialize(product, user.role) for product in products]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate, user: CurrentUser, db: DbSession
) -> dict[str, object]:
    _forbid_seller_cost(
        role=user.role,
        cost_provided="cost" in body.model_fields_set,
    )
    unit = _resolve_unit(body.price_type, body.unit)
    product = Product(
        business_id=user.business_id,
        name=body.name,
        price_type=body.price_type,
        price=body.price,
        unit=unit,
        iva=body.iva,
        cost=body.cost if user.role == Role.ADMIN else None,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _serialize(product, user.role)


@router.patch("/{product_id}")
def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    user: CurrentUser,
    db: DbSession,
) -> dict[str, object]:
    product = _get_owned_product(db, product_id, user)
    fields = body.model_fields_set
    _forbid_seller_cost(role=user.role, cost_provided="cost" in fields)

    if "name" in fields and body.name is not None:
        product.name = body.name
    if "price" in fields and body.price is not None:
        product.price = body.price
    if "iva" in fields and body.iva is not None:
        product.iva = body.iva
    if "active" in fields and body.active is not None:
        product.active = body.active
    if "cost" in fields and user.role == Role.ADMIN:
        product.cost = body.cost

    if "price_type" in fields and body.price_type is not None:
        next_price_type = body.price_type
    else:
        next_price_type = product.price_type
    next_unit_input = body.unit if "unit" in fields else None
    if "price_type" in fields or "unit" in fields:
        product.price_type = next_price_type
        product.unit = _resolve_unit(
            next_price_type,
            next_unit_input,
            existing_unit=product.unit,
        )

    db.commit()
    db.refresh(product)
    return _serialize(product, user.role)
