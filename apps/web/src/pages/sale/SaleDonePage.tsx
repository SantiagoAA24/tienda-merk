import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button, StatusChip } from "@/components";
import { IconCheck, IconOffline } from "@/components/icons";
import { clearCart } from "@/db/cart";
import { countPendingSales, getSaleById } from "@/db/sales";
import {
  formatMoney,
  formatShortDate,
  formatTime,
} from "@/lib/format";
import { onPendingSalesChange } from "@/sales/sync";
import { PAYMENT_LABELS, type LocalSale } from "@/sales/types";

function chipStatus(
  sale: LocalSale,
): "accepted" | "pending" | "rejected" {
  if (sale.invoiceStatus === "accepted") return "accepted";
  if (sale.invoiceStatus === "rejected") return "rejected";
  return "pending";
}

export function SaleDonePage() {
  const { saleId = "" } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<LocalSale | null | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = liveQuery(() => getSaleById(saleId)).subscribe({
      next: (row) => setSale(row ?? null),
      error: () => setSale(null),
    });
    return () => unsubscribe.unsubscribe();
  }, [saleId]);

  useEffect(() => {
    const unsubscribeLive = liveQuery(() => countPendingSales()).subscribe({
      next: (value) => setPendingCount(value),
      error: () => setPendingCount(0),
    });
    const unsubscribeSync = onPendingSalesChange(setPendingCount);
    return () => {
      unsubscribeLive.unsubscribe();
      unsubscribeSync();
    };
  }, []);

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

  const awaitingSync = sale.syncStatus !== "synced";
  const soldAt = new Date(sale.soldAt);
  const customerLabel =
    sale.customerMode === "named" && sale.customer
      ? sale.customer.name
      : "Consumidor final";
  const invoiceLabel = sale.invoiceNumber ?? sale.internalNumber;

  if (awaitingSync) {
    return (
      <div className="tem-app tem-sale tem-sale-done tem-sale-done--offline">
        <div className="tem-offline-banner" role="status">
          <IconOffline size={20} />
          <span>Sin internet · las ventas se guardan y se envían después</span>
        </div>

        <div className="tem-sale-done__hero">
          <div className="tem-sale-done__check tem-sale-done__check--soft" aria-hidden>
            <IconCheck size={48} strokeWidth={3} />
          </div>
          <h1 className="tem-sale-done__title">Venta guardada</h1>
          <div className="tem-sale-done__amount">{formatMoney(sale.total)}</div>
          <div className="tem-sale-done__invoice">
            <StatusChip status={chipStatus(sale)} />
          </div>
          <p className="tem-sale-done__tip">
            Entregó el cambio y listo. La factura se envía sola a la DIAN cuando
            vuelva el internet.
          </p>
        </div>

        <section className="tem-sale-card" aria-label="Resumen de envío">
          <div className="tem-sale-done__row">
            <span>Factura</span>
            <strong>{invoiceLabel}</strong>
          </div>
          <div className="tem-sale-done__row">
            <span>Pendientes por enviar</span>
            <strong>{pendingCount}</strong>
          </div>
        </section>

        <div className="tem-sale-done__actions">
          <Button variant="secondary" onClick={() => navigate("/")}>
            Ver ventas
          </Button>
          <Button variant="primary" onClick={() => void handleNewSale()}>
            Nueva venta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tem-app tem-sale tem-sale-done">
      <div className="tem-sale-done__hero">
        <div className="tem-sale-done__check" aria-hidden>
          <IconCheck size={36} strokeWidth={3} />
        </div>
        <h1 className="tem-sale-done__title">Venta registrada</h1>
        <div className="tem-sale-done__amount">{formatMoney(sale.total)}</div>
        <div className="tem-sale-done__invoice">
          <span>
            {sale.invoiceNumber
              ? `Factura ${sale.invoiceNumber}`
              : `Venta ${sale.internalNumber}`}
          </span>
          <StatusChip status={chipStatus(sale)} />
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
