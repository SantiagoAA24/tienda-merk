import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BackHeader, Button, Chip, Segmented } from "@/components";
import { IconPlus } from "@/components/icons";
import { addWeightLine } from "@/db/cart";
import { getProductById } from "@/db/products";
import type { LocalProduct } from "@/db/schema";
import { formatMoney, formatProductPrice } from "@/lib/format";
import {
  lineTotalPesos,
  millisToQuantityInput,
  parseQuantityToMillis,
} from "@/lib/pricing";
import type { Unit } from "@/products/types";

type WeightUnit = Exclude<Unit, "und">;

const UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];

const SHORTCUTS: { label: string; millis: number; unit: "kg" }[] = [
  { label: "½ kg", millis: 500, unit: "kg" },
  { label: "1 kg", millis: 1000, unit: "kg" },
  { label: "2 kg", millis: 2000, unit: "kg" },
  { label: "5 kg", millis: 5000, unit: "kg" },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"] as const;

export function WeightPage() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<LocalProduct | null | undefined>(
    undefined,
  );
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [raw, setRaw] = useState("2,5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getProductById(productId).then((row) => {
      if (!cancelled) {
        setProduct(row ?? null);
        if (row && row.unit !== "und") {
          setUnit(row.unit);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const quantityMillis = parseQuantityToMillis(raw) ?? 0;
  const unitPrice = product ? Number(product.price) : 0;
  const priceUnit =
    product && product.unit !== "und" ? product.unit : ("kg" as const);

  const lineTotal = useMemo(() => {
    if (!product || product.price_type !== "weight" || quantityMillis <= 0) {
      return 0;
    }
    return lineTotalPesos({
      unitPricePesos: unitPrice,
      quantityMillis,
      quantityUnit: unit,
      priceUnit,
      priceType: "weight",
    });
  }, [product, quantityMillis, unit, unitPrice, priceUnit]);

  function appendKey(key: (typeof KEYS)[number]) {
    setRaw((current) => {
      if (key === "back") {
        return current.slice(0, -1);
      }
      if (key === ",") {
        if (current.includes(",")) return current;
        return current === "" ? "0," : `${current},`;
      }
      if (current === "0") {
        return key;
      }
      const [, frac = ""] = current.split(",");
      if (current.includes(",") && frac.length >= 3) {
        return current;
      }
      return `${current}${key}`;
    });
  }

  function applyShortcut(millis: number) {
    setUnit("kg");
    setRaw(millisToQuantityInput(millis));
  }

  async function handleAdd() {
    if (!product || product.price_type !== "weight" || quantityMillis <= 0) {
      return;
    }
    setSaving(true);
    try {
      await addWeightLine({
        productId: product.id,
        name: product.name,
        unitPricePesos: unitPrice,
        quantityMillis,
        unit,
        priceUnit,
        priceType: "weight",
        iva: product.iva,
      });
      navigate("/venta");
    } finally {
      setSaving(false);
    }
  }

  if (product === undefined) {
    return (
      <div className="tem-app tem-sale tem-sale--weight">
        <p className="tem-sale__empty" role="status">
          Cargando…
        </p>
      </div>
    );
  }

  if (product === null || product.price_type !== "weight") {
    return (
      <div className="tem-app tem-sale tem-sale--weight">
        <BackHeader title="Peso" to="/venta" backLabel="Cerrar" />
        <p className="tem-sale__empty" role="status">
          Producto no encontrado o no es por peso.
        </p>
      </div>
    );
  }

  return (
    <div className="tem-app tem-sale tem-sale--weight">
      <BackHeader
        title={product.name}
        to="/venta"
        backLabel="Cerrar"
        trailing={<Chip variant="weight">Por peso</Chip>}
      />

      <section className="tem-weight-card" aria-label="Peso del producto">
        <div className="tem-weight-card__display">
          <span className="tem-weight-card__value">{raw || "0"}</span>
          <span className="tem-weight-card__unit">{unit}</span>
        </div>

        <Segmented
          label="Unidad"
          options={UNIT_OPTIONS}
          value={unit}
          onChange={(value) => setUnit(value)}
          size="compact"
        />

        <div className="tem-weight-card__shortcuts" role="group" aria-label="Atajos">
          {SHORTCUTS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="tem-weight-card__shortcut"
              onClick={() => applyShortcut(item.millis)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="tem-weight-card__footer">
          <span>
            {formatProductPrice(product.price, "weight", product.unit)}
          </span>
          <div>
            <div className="tem-weight-card__total-label">Total del producto</div>
            <div className="tem-weight-card__total">{formatMoney(lineTotal)}</div>
          </div>
        </div>
      </section>

      <div className="tem-keypad" role="group" aria-label="Teclado de peso">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="tem-keypad__key"
            aria-label={
              key === ","
                ? "Coma decimal"
                : key === "back"
                  ? "Borrar"
                  : undefined
            }
            onClick={() => appendKey(key)}
          >
            {key === "back" ? "⌫" : key}
          </button>
        ))}
      </div>

      <div className="tem-sale__footer-cta">
        <Button
          variant="primary"
          className="tem-sale__add"
          disabled={quantityMillis <= 0 || saving}
          onClick={() => void handleAdd()}
        >
          <IconPlus size={22} />
          Agregar a la venta
        </Button>
      </div>
    </div>
  );
}
