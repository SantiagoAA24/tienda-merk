import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError, NetworkError } from "@/auth/api";
import { useAuth } from "@/auth/context";
import { Alert, Button, Field, IconButton, Segmented } from "@/components";
import { IconCheck, IconClose } from "@/components/icons";
import { getProductById, upsertProduct } from "@/db/products";
import { createProduct, updateProduct } from "@/products/api";
import type { Iva, PriceType, Unit } from "@/products/types";
import {
  formToCreateBody,
  type ProductFormValues,
  validateProductForm,
} from "@/products/validation";

const PRICE_TYPE_OPTIONS = [
  { value: "fixed" as const, label: "Precio fijo" },
  { value: "weight" as const, label: "Por peso" },
];

const UNIT_OPTIONS = [
  { value: "g" as const, label: "g" },
  { value: "kg" as const, label: "kg" },
  { value: "lb" as const, label: "lb" },
];

const IVA_OPTIONS = [
  { value: "excluido" as const, label: "Excluido" },
  { value: "exento" as const, label: "Exento" },
  { value: "5" as const, label: "5%" },
  { value: "19" as const, label: "19%" },
];

const EMPTY: ProductFormValues = {
  name: "",
  priceType: "weight",
  price: "",
  unit: "kg",
  iva: "excluido",
  cost: "",
};

export function ProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAuth();
  const isAdmin =
    state.status === "authenticated" && state.user.role === "admin";

  const [values, setValues] = useState<ProductFormValues>(EMPTY);
  const [errors, setErrors] = useState(() => validateProductForm(EMPTY));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode !== "edit" || !id) {
      return;
    }
    let cancelled = false;
    void getProductById(id).then((product) => {
      if (cancelled) {
        return;
      }
      if (!product) {
        navigate("/productos", { replace: true });
        return;
      }
      const next: ProductFormValues = {
        name: product.name,
        priceType: product.price_type,
        price: String(Math.round(Number(product.price))),
        unit: product.unit === "und" ? "kg" : product.unit,
        iva: product.iva,
        cost: product.cost ? String(Math.round(Number(product.cost))) : "",
      };
      setValues(next);
      setErrors(validateProductForm(next));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, mode, navigate]);

  function update<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "priceType" && value === "fixed") {
        next.unit = "und";
      }
      if (key === "priceType" && value === "weight" && current.unit === "und") {
        next.unit = "kg";
      }
      setErrors(validateProductForm(next));
      return next;
    });
  }

  const canSubmit = Object.keys(validateProductForm(values)).length === 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = formToCreateBody(values, isAdmin);
      const saved =
        mode === "create"
          ? await createProduct(body)
          : await updateProduct(id!, body);
      await upsertProduct(saved);
      navigate("/productos");
    } catch (error) {
      if (error instanceof NetworkError) {
        setFormError("Sin conexión. Revisa el internet e intenta de nuevo.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("No se pudo guardar el producto.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!id) {
      return;
    }
    setDeactivating(true);
    setFormError(null);
    try {
      const saved = await updateProduct(id, { active: false });
      await upsertProduct(saved);
      navigate("/productos");
    } catch (error) {
      if (error instanceof NetworkError) {
        setFormError("Sin conexión. Revisa el internet e intenta de nuevo.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("No se pudo desactivar el producto.");
      }
    } finally {
      setDeactivating(false);
    }
  }

  const unitForLabel = values.unit === "und" ? "kg" : values.unit;
  const priceLabel =
    values.priceType === "weight" ? `Precio por ${unitForLabel}` : "Precio";
  const costLabel =
    values.priceType === "weight"
      ? `Costo por ${unitForLabel} (opcional)`
      : "Costo (opcional)";

  if (loading) {
    return (
      <main className="tem-app tem-auth-loading" aria-busy="true">
        <p className="tem-muted">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="tem-app tem-product-form">
      <div className="tem-backheader">
        <IconButton
          aria-label="Cerrar"
          className="tem-backheader__back"
          onClick={() => navigate("/productos")}
        >
          <IconClose size={22} strokeWidth={2.4} />
        </IconButton>
        <h1 className="tem-backheader__title">
          {mode === "create" ? "Nuevo producto" : "Editar producto"}
        </h1>
      </div>

      <form
        className="tem-product-form__body"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        {formError ? (
          <Alert className="tem-auth-form__alert">{formError}</Alert>
        ) : null}

        <Field
          label="Nombre del producto"
          error={touched ? errors.name : undefined}
          inputProps={{
            value: values.name,
            onChange: (event) => update("name", event.target.value),
            autoComplete: "off",
          }}
        />

        <Segmented
          label="Tipo de precio"
          options={PRICE_TYPE_OPTIONS}
          value={values.priceType}
          onChange={(value: PriceType) => update("priceType", value)}
        />

        <div
          className={
            values.priceType === "weight"
              ? "tem-product-form__row"
              : undefined
          }
        >
          <Field
            label={priceLabel}
            error={touched ? errors.price : undefined}
            inputProps={{
              inputMode: "numeric",
              value: values.price,
              onChange: (event) => update("price", event.target.value),
            }}
          />
          {values.priceType === "weight" ? (
            <Segmented
              label="Unidad"
              options={UNIT_OPTIONS}
              value={values.unit === "und" ? "kg" : values.unit}
              onChange={(value: Unit) => update("unit", value)}
            />
          ) : null}
        </div>
        {touched && errors.unit ? (
          <p className="tem-field__error" role="alert">
            {errors.unit}
          </p>
        ) : null}

        <div>
          <Segmented
            label="Impuesto (IVA)"
            options={IVA_OPTIONS}
            value={values.iva}
            onChange={(value: Iva) => update("iva", value)}
            size="compact"
          />
          <p className="tem-product-form__iva-help">
            Si no estás seguro de cuál aplica, pregúntale a tu contador.
          </p>
        </div>

        {isAdmin ? (
          <Field
            label={costLabel}
            error={touched ? errors.cost : undefined}
            inputProps={{
              inputMode: "numeric",
              placeholder: "Para calcular tu ganancia",
              value: values.cost,
              onChange: (event) => update("cost", event.target.value),
            }}
          />
        ) : null}

        <div className="tem-product-form__actions">
          {mode === "edit" ? (
            <button
              type="button"
              className="tem-product-form__deactivate"
              onClick={() => void handleDeactivate()}
              disabled={deactivating || saving}
            >
              Desactivar producto
            </button>
          ) : null}
          <Button type="submit" variant="primary" disabled={saving || !canSubmit}>
            <IconCheck size={26} />
            Guardar producto
          </Button>
        </div>
      </form>
    </main>
  );
}
