from decimal import Decimal
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.models.enums import Iva, PriceType, Unit

# TODO(contador): confirmar las categorías de IVA que aplican a la tienda.
WEIGHT_UNITS = frozenset({Unit.GRAM, Unit.KILOGRAM, Unit.POUND})

ProductName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
NonNegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]


class ProductCreate(BaseModel):
    name: ProductName
    price_type: PriceType
    price: NonNegativeMoney
    unit: Unit | None = None
    iva: Iva
    cost: NonNegativeMoney | None = None

    @model_validator(mode="after")
    def validate_unit_for_price_type(self) -> Self:
        if self.price_type == PriceType.WEIGHT:
            if self.unit is None or self.unit not in WEIGHT_UNITS:
                raise ValueError(
                    "Los productos por peso deben usar unidad g, kg o lb."
                )
        else:
            if self.unit is not None and self.unit != Unit.UNIT:
                raise ValueError(
                    "Los productos de precio fijo deben usar la unidad und."
                )
            self.unit = Unit.UNIT
        return self


class ProductUpdate(BaseModel):
    name: ProductName | None = None
    price_type: PriceType | None = None
    price: NonNegativeMoney | None = None
    unit: Unit | None = None
    iva: Iva | None = None
    cost: NonNegativeMoney | None = None
    active: bool | None = None

    @field_validator("cost")
    @classmethod
    def cost_non_negative(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and value < 0:
            raise ValueError("El costo no puede ser negativo.")
        return value


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    price_type: PriceType
    price: Decimal
    unit: Unit
    iva: Iva
    cost: Decimal | None = None
    active: bool
