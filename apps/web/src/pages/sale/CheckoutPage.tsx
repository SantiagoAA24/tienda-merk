import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, BackHeader, Button, Field, Input, Segmented } from "@/components";
import { IconSales } from "@/components/icons";
import { getCart, updateCheckoutDraft } from "@/db/cart";
import { createSaleFromCart } from "@/db/sales";
import { formatMoney, formatQuantity } from "@/lib/format";
import { saleTotals } from "@/lib/pricing";
import { parseMoneyInput } from "@/products/validation";
import {
  PAYMENT_LABELS,
  type CartDraft,
  type PaymentMethod,
} from "@/sales/types";

const CUSTOMER_OPTIONS = [
  { value: "final", label: "Consumidor final" },
  { value: "named", label: "Con datos" },
] as const;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: PAYMENT_LABELS.cash },
  { value: "transfer", label: PAYMENT_LABELS.transfer },
  { value: "card", label: PAYMENT_LABELS.card },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartDraft | null>(null);
  const [cashInput, setCashInput] = useState("");
  const [cashHydrated, setCashHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const subscription = liveQuery(() => getCart()).subscribe({
      next: (value) => {
        setCart(value);
        if (!cashHydrated) {
          setCashHydrated(true);
          if (value.cashReceivedPesos !== null) {
            setCashInput(String(value.cashReceivedPesos));
          }
        }
      },
      error: () => setCart(null),
    });
    return () => subscription.unsubscribe();
  }, [cashHydrated]);

  const totals = saleTotals(cart?.lines ?? []);
  const cashReceived = parseMoneyInput(cashInput);
  const change =
    cart?.paymentMethod === "cash" && cashReceived !== null
      ? Math.max(0, cashReceived - totals.total)
      : null;

  async function setCustomerMode(mode: "final" | "named") {
    if (mode === "named") {
      await updateCheckoutDraft({ customerMode: "named" });
      navigate("/venta/cliente");
      return;
    }
    await updateCheckoutDraft({ customerMode: "final", customer: null });
  }

  async function setPayment(method: PaymentMethod) {
    await updateCheckoutDraft({
      paymentMethod: method,
      cashReceivedPesos: method === "cash" ? cashReceived : null,
    });
  }

  async function handleCashBlur() {
    const value = parseMoneyInput(cashInput);
    await updateCheckoutDraft({ cashReceivedPesos: value });
  }

  async function handleCharge() {
    setError(null);
    if (!cart || cart.lines.length === 0) {
      setError("La venta está vacía.");
      return;
    }
    if (cart.paymentMethod === "cash") {
      const value = parseMoneyInput(cashInput);
      if (value === null || value < totals.total) {
        setError("El efectivo recibido debe cubrir el total.");
        return;
      }
      await updateCheckoutDraft({ cashReceivedPesos: value });
    }
    setSaving(true);
    try {
      const result = await createSaleFromCart();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(`/venta/lista/${result.sale.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (cart && cart.lines.length === 0) {
    return (
      <div className="tem-app tem-sale">
        <BackHeader title="Cobrar" to="/venta" />
        <p className="tem-sale__empty" role="status">
          No hay productos en la venta.
        </p>
      </div>
    );
  }

  return (
    <div className="tem-app tem-sale">
      <BackHeader title="Cobrar" to="/venta" />

      <section className="tem-sale-card" aria-labelledby="checkout-summary">
        <h2 id="checkout-summary" className="tem-sale__section-title">
          Resumen
        </h2>
        <ul className="tem-sale__lines">
          {cart?.lines.map((line) => (
            <li key={line.id} className="tem-sale__line">
              <div className="tem-sale__line-name">
                {line.name} ·{" "}
                {formatQuantity(line.quantityMillis, line.unit, {
                  asMillis: true,
                })}
              </div>
              <div className="tem-sale__line-total">
                {formatMoney(line.lineTotal)}
              </div>
            </li>
          ))}
        </ul>
        <div className="tem-checkout__total-row">
          <span>Total a cobrar</span>
          <strong>{formatMoney(totals.total)}</strong>
        </div>
      </section>

      <section className="tem-sale-card" aria-labelledby="checkout-customer">
        <Segmented
          label="Cliente"
          labelId="checkout-customer"
          options={[...CUSTOMER_OPTIONS]}
          value={cart?.customerMode === "named" ? "named" : "final"}
          onChange={(value) => void setCustomerMode(value)}
        />
        {cart?.customerMode === "named" && cart.customer ? (
          <p className="tem-checkout__hint">
            {cart.customer.name} · {cart.customer.document}
          </p>
        ) : (
          <p className="tem-checkout__hint">
            Para factura a nombre de una persona o empresa, elige &quot;Con
            datos&quot;.
          </p>
        )}
      </section>

      <section className="tem-sale-card" aria-labelledby="checkout-payment">
        <Segmented
          label="Medio de pago"
          labelId="checkout-payment"
          options={PAYMENT_OPTIONS}
          value={cart?.paymentMethod ?? "cash"}
          onChange={(value) => void setPayment(value)}
        />
        {cart?.paymentMethod === "cash" ? (
          <div className="tem-checkout__cash">
            <Field label="Recibido" id="cash-received">
              <Input
                id="cash-received"
                inputMode="numeric"
                value={cashInput}
                onChange={(event) => setCashInput(event.target.value)}
                onBlur={() => void handleCashBlur()}
                placeholder="0"
              />
            </Field>
            <div className="tem-checkout__change" role="status">
              <span>Devuelta</span>
              <strong>{formatMoney(change ?? 0)}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <p className="tem-checkout__offline-note">
        Se envía a la DIAN. Si no hay internet, queda por reenviar.
      </p>

      <div className="tem-sale__footer-cta">
        <Button
          variant="primary"
          className="tem-sale__add"
          disabled={saving || !cart || cart.lines.length === 0}
          onClick={() => void handleCharge()}
        >
          <IconSales size={22} />
          Cobrar y facturar
        </Button>
      </div>
    </div>
  );
}
