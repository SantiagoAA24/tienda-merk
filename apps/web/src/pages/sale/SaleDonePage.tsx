import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button, StatusChip } from "@/components";
import { IconCheck } from "@/components/icons";
import { clearCart } from "@/db/cart";
import { getSaleById } from "@/db/sales";
import {
  formatMoney,
  formatShortDate,
  formatTime,
} from "@/lib/format";
import { PAYMENT_LABELS, type LocalSale } from "@/sales/types";

export function SaleDonePage() {
  const { saleId = "" } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<LocalSale | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getSaleById(saleId).then((row) => {
      if (!cancelled) setSale(row ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  async function handleNewSale() {
    await clearCart();
    navigate("/venta");
  }

  if (sale === undefined) {
    return (
      <div className="tem-app tem-sale tem-sale-done">
        <p className="tem-sale__empty" role="status">
          Cargando…
        </p>
      </div>
    );
  }

  if (sale === null) {
    return (
      <div className="tem-app tem-sale tem-sale-done">
        <p className="tem-sale__empty" role="status">
          No encontramos esa venta.
        </p>
        <div className="tem-sale__footer-cta">
          <Button variant="primary" onClick={() => navigate("/venta")}>
            Nueva venta
          </Button>
        </div>
      </div>
    );
  }

  const soldAt = new Date(sale.soldAt);
  const customerLabel =
    sale.customerMode === "named" && sale.customer
      ? sale.customer.name
      : "Consumidor final";

  return (
    <div className="tem-app tem-sale tem-sale-done">
      <div className="tem-sale-done__hero">
        <div className="tem-sale-done__check" aria-hidden>
          <IconCheck size={36} strokeWidth={3} />
        </div>
        <h1 className="tem-sale-done__title">Venta registrada</h1>
        <div className="tem-sale-done__amount">{formatMoney(sale.total)}</div>
        <div className="tem-sale-done__invoice">
          <span>Venta {sale.internalNumber}</span>
          <StatusChip status="pending" />
        </div>
      </div>

      <section className="tem-sale-card" aria-label="Detalle de la venta">
        <div className="tem-sale-done__row">
          <span>Fecha</span>
          <strong>
            {formatShortDate(soldAt)} · {formatTime(soldAt)}
          </strong>
        </div>
        <div className="tem-sale-done__row">
          <span>Cliente</span>
          <strong>{customerLabel}</strong>
        </div>
        <div className="tem-sale-done__row">
          <span>Medio de pago</span>
          <strong>{PAYMENT_LABELS[sale.paymentMethod]}</strong>
        </div>
        {sale.paymentMethod === "cash" &&
        sale.cashReceivedPesos !== null &&
        sale.changePesos !== null ? (
          <div className="tem-sale-done__row">
            <span>Recibido · Devuelta</span>
            <strong>
              {formatMoney(sale.cashReceivedPesos)} ·{" "}
              {formatMoney(sale.changePesos)}
            </strong>
          </div>
        ) : null}
      </section>

      <div className="tem-sale-done__actions">
        <Button variant="secondary" disabled>
          Compartir factura
        </Button>
        <Button variant="primary" onClick={() => void handleNewSale()}>
          Nueva venta
        </Button>
      </div>
    </div>
  );
}
