import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";

import { ApiError, NetworkError } from "@/auth/api";
import {
  Alert,
  BackHeader,
  Button,
  Card,
  CardTitle,
  Chip,
  Field,
  RetryBanner,
} from "@/components";
import { listLocalSales, needsRetry } from "@/db/sales";
import { formatMoney, formatShortDate } from "@/lib/format";
import { bogotaDateString, periodRange } from "@/lib/period";
import { filterSalesByRange, summarizeSales } from "@/sales/aggregates";
import { postClosing } from "@/sales/api";
import { pullAndMergeSales } from "@/sales/merge";
import { syncPendingSales } from "@/sales/sync";
import { PAYMENT_LABELS, type LocalSale } from "@/sales/types";

function parsePesosInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function ClosingPage() {
  const [sales, setSales] = useState<LocalSale[] | null>(null);
  const [openingRaw, setOpeningRaw] = useState("50000");
  const [countedRaw, setCountedRaw] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = bogotaDateString();
  const range = useMemo(() => periodRange("today"), []);

  useEffect(() => {
    const observable = liveQuery(() => listLocalSales());
    const subscription = observable.subscribe({
      next: (rows) => setSales(rows),
      error: () => setSales([]),
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void pullAndMergeSales(range.from, range.to);
  }, [range.from, range.to]);

  const todaySales = useMemo(
    () => (sales ? filterSalesByRange(sales, range) : []),
    [sales, range],
  );
  const summary = summarizeSales(todaySales);
  const retryCount = sales ? sales.filter(needsRetry).length : 0;

  const opening = parsePesosInput(openingRaw) ?? 0;
  const counted = parsePesosInput(countedRaw);
  const expected = opening + summary.byPayment.cash;
  const difference = counted === null ? null : counted - expected;

  async function handleRetry() {
    setRetrying(true);
    try {
      await syncPendingSales();
      await pullAndMergeSales(range.from, range.to);
    } finally {
      setRetrying(false);
    }
  }

  async function handleClose() {
    setError(null);
    if (counted === null) {
      setError("Escribe el efectivo contado.");
      return;
    }
    setSaving(true);
    try {
      await postClosing({
        closing_date: today,
        opening_cash: String(opening),
        counted_cash: String(counted),
      });
      setDone(true);
    } catch (err) {
      if (err instanceof NetworkError) {
        setError(
          "Sin conexión. El cierre necesita internet para guardarse en el servidor.",
        );
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo cerrar el día. Intenta de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  const cuadraLabel =
    difference === null
      ? "Escribe el contado"
      : difference === 0
        ? "Cuadra: diferencia $0"
        : difference > 0
          ? `Sobra: ${formatMoney(difference)}`
          : `Falta: ${formatMoney(Math.abs(difference))}`;

  return (
    <div className="tem-app">
      <BackHeader title="Cierre del día" to="/mas" />
      <main className="tem-cierre">
        <Card>
          <div className="tem-cierre__date">
            Hoy · {formatShortDate(new Date(`${today}T12:00:00-05:00`))}
          </div>
          <div className="tem-cierre__total">{formatMoney(summary.total)}</div>
          <div className="tem-cierre__meta">
            {summary.count === 1 ? "1 venta" : `${summary.count} ventas`} ·{" "}
            {formatMoney(summary.average)} por venta
          </div>
        </Card>

        <Card>
          <CardTitle>Por medio de pago</CardTitle>
          <div className="tem-cierre__rows">
            {(Object.keys(PAYMENT_LABELS) as Array<keyof typeof PAYMENT_LABELS>).map(
              (method) => (
                <div key={method} className="tem-cierre__row">
                  <span>{PAYMENT_LABELS[method]}</span>
                  <strong>{formatMoney(summary.byPayment[method])}</strong>
                </div>
              ),
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Cuadre de efectivo</CardTitle>
          <div className="tem-cierre__rows">
            <Field
              label="Base de la mañana"
              inputProps={{
                inputMode: "numeric",
                value: openingRaw,
                onChange: (event) => setOpeningRaw(event.target.value),
                "aria-label": "Base de la mañana",
              }}
            />
            <div className="tem-cierre__row">
              <span>Esperado en caja</span>
              <strong>{formatMoney(expected)}</strong>
            </div>
            <Field
              label="Efectivo contado"
              inputProps={{
                inputMode: "numeric",
                value: countedRaw,
                onChange: (event) => setCountedRaw(event.target.value),
                "aria-label": "Efectivo contado",
              }}
            />
            <Chip
              variant={
                difference === null
                  ? "weight"
                  : difference === 0
                    ? "ok"
                    : "error"
              }
            >
              {cuadraLabel}
            </Chip>
          </div>
        </Card>

        <RetryBanner
          count={retryCount}
          onRetry={() => void handleRetry()}
          busy={retrying}
        />

        {error ? <Alert>{error}</Alert> : null}
        {done ? (
          <p className="tem-muted" role="status">
            Día cerrado. Esperado {formatMoney(expected)}, diferencia{" "}
            {formatMoney(difference ?? 0)}.
          </p>
        ) : null}

        <div className="tem-cierre__footer">
          <Button
            variant="primary"
            onClick={() => void handleClose()}
            disabled={saving || done}
          >
            {done ? "Día cerrado" : "Cerrar el día"}
          </Button>
        </div>
      </main>
    </div>
  );
}
