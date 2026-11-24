import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AppShell,
  Button,
  Card,
  ListRow,
  RetryBanner,
  Segmented,
} from "@/components";
import { IconPlus, IconSales } from "@/components/icons";
import {
  displayInvoiceStatus,
  listLocalSales,
  needsRetry,
} from "@/db/sales";
import { formatMoney, formatTime } from "@/lib/format";
import {
  periodRange,
  type SalesPeriod,
} from "@/lib/period";
import { filterSalesByRange } from "@/sales/aggregates";
import { pullAndMergeSales } from "@/sales/merge";
import { syncPendingSales } from "@/sales/sync";
import { PAYMENT_LABELS, type LocalSale } from "@/sales/types";

const PERIODS: { value: SalesPeriod; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "week", label: "Esta semana" },
];

const EMPTY_COPY: Record<SalesPeriod, string> = {
  today: "Aún no hay ventas hoy",
  yesterday: "Aún no hay ventas de ayer",
  week: "Aún no hay ventas esta semana",
};

export function VentasPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<SalesPeriod>("today");
  const [sales, setSales] = useState<LocalSale[] | null>(null);
  const [retrying, setRetrying] = useState(false);

  const range = useMemo(() => periodRange(period), [period]);

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

  const filtered = useMemo(
    () => (sales ? filterSalesByRange(sales, range) : []),
    [sales, range],
  );
  const retryCount = useMemo(
    () => (sales ? sales.filter(needsRetry).length : 0),
    [sales],
  );
  const empty = sales !== null && filtered.length === 0;

  async function handleRetry() {
    setRetrying(true);
    try {
      await syncPendingSales();
      await pullAndMergeSales(range.from, range.to);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <AppShell active="ventas">
      <main className="tem-ventas">
        <h1 className="tem-ventas__title">Ventas</h1>

        <Segmented
          label="Periodo"
          labelId="ventas-period"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />

        <RetryBanner
          count={retryCount}
          onRetry={() => void handleRetry()}
          busy={retrying}
        />

        {empty ? (
          <div className="tem-ventas-empty">
            <div className="tem-ventas-empty__icon" aria-hidden>
              <IconSales size={44} />
            </div>
            <h2 className="tem-ventas-empty__title">{EMPTY_COPY[period]}</h2>
            <p className="tem-ventas-empty__text">
              Cuando hagas la primera venta, aparece aquí con su factura.
            </p>
            <Button
              variant="primary"
              className="tem-home__cta"
              onClick={() => navigate("/venta")}
            >
              <IconPlus />
              Nueva venta
            </Button>
          </div>
        ) : (
          <Card className="tem-ventas__list">
            {filtered.map((sale) => (
              <button
                key={sale.id}
                type="button"
                className="tem-ventas__row"
                onClick={() => navigate(`/venta/lista/${sale.id}`)}
              >
                <ListRow
                  title={`${sale.invoiceNumber ?? sale.internalNumber} · ${formatMoney(sale.total)}`}
                  meta={`${formatTime(new Date(sale.soldAt))} · ${PAYMENT_LABELS[sale.paymentMethod]}`}
                  status={displayInvoiceStatus(sale)}
                />
              </button>
            ))}
          </Card>
        )}
      </main>
    </AppShell>
  );
}
