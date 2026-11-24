import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AppShell,
  Button,
  Card,
  CardHead,
  CardTitle,
  DeltaChip,
  Header,
  RankRow,
  Stats,
  WeekChart,
  type WeekChartDay,
} from "@/components";
import { IconPlus } from "@/components/icons";
import { listLocalSales } from "@/db/sales";
import {
  formatLongDate,
  formatMoney,
  formatQuantity,
} from "@/lib/format";
import {
  addDays,
  bogotaDateString,
  bogotaHour,
  dayRange,
  greetingForHour,
  periodRange,
} from "@/lib/period";
import type { Unit } from "@/products/types";
import {
  filterSalesByRange,
  percentDelta,
  summarizeSales,
  topProducts,
} from "@/sales/aggregates";
import {
  fetchStatsSummary,
  fetchTopProducts,
  type StatsSummary,
  type TopProduct,
} from "@/sales/api";
import { pullAndMergeSales } from "@/sales/merge";
import type { LocalSale } from "@/sales/types";

function asUnit(value: string): Unit {
  if (value === "g" || value === "kg" || value === "lb" || value === "und") {
    return value;
  }
  return "und";
}

const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export function HomePage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<LocalSale[] | null>(null);
  const [remoteDay, setRemoteDay] = useState<StatsSummary | null>(null);
  const [remoteWeek, setRemoteWeek] = useState<StatsSummary | null>(null);
  const [remoteTop, setRemoteTop] = useState<TopProduct[] | null>(null);

  const today = bogotaDateString();
  const todayRange = useMemo(() => periodRange("today"), []);
  const yesterdayRange = useMemo(() => periodRange("yesterday"), []);
  const weekRange = useMemo(() => periodRange("week"), []);

  useEffect(() => {
    const observable = liveQuery(() => listLocalSales());
    const subscription = observable.subscribe({
      next: (rows) => setSales(rows),
      error: () => setSales([]),
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void (async () => {
      await pullAndMergeSales(weekRange.from, weekRange.to);
      try {
        const [day, week, top] = await Promise.all([
          fetchStatsSummary({ period: "day", on: today }),
          fetchStatsSummary({ period: "week", on: today }),
          fetchTopProducts({ period: "day", on: today, limit: 3 }),
        ]);
        setRemoteDay(day);
        setRemoteWeek(week);
        setRemoteTop(top);
      } catch {
        setRemoteDay(null);
        setRemoteWeek(null);
        setRemoteTop(null);
      }
    })();
  }, [today, weekRange.from, weekRange.to]);

  const localToday = useMemo(
    () => (sales ? filterSalesByRange(sales, todayRange) : []),
    [sales, todayRange],
  );
  const localYesterday = useMemo(
    () => (sales ? filterSalesByRange(sales, yesterdayRange) : []),
    [sales, yesterdayRange],
  );
  const localWeek = useMemo(
    () => (sales ? filterSalesByRange(sales, weekRange) : []),
    [sales, weekRange],
  );

  const localTodaySummary = summarizeSales(localToday);
  const localYesterdaySummary = summarizeSales(localYesterday);
  const localWeekSummary = summarizeSales(localWeek);
  const localTop = topProducts(localToday, 3);

  const unsyncedToday = localToday.filter(
    (sale) => sale.syncStatus === "pending" || sale.syncStatus === "error",
  );
  const unsyncedExtra = summarizeSales(unsyncedToday);

  const dayTotal =
    (remoteDay ? Number(remoteDay.total) : localTodaySummary.total) +
    (remoteDay ? unsyncedExtra.total : 0);
  const dayCount =
    (remoteDay ? remoteDay.sale_count : localTodaySummary.count) +
    (remoteDay ? unsyncedExtra.count : 0);
  const dayAverage =
    dayCount === 0 ? 0 : Math.round(dayTotal / dayCount);
  const previousTotal = remoteDay
    ? Number(remoteDay.previous_total)
    : localYesterdaySummary.total;
  const delta = percentDelta(dayTotal, previousTotal);

  const invoicesAccepted =
    (remoteDay?.invoices_accepted ?? localTodaySummary.invoicesAccepted) +
    (remoteDay
      ? unsyncedToday.filter((s) => s.invoiceStatus === "accepted").length
      : 0);
  const invoicesTotal =
    (remoteDay?.invoices_total ?? localTodaySummary.invoicesTotal) +
    (remoteDay ? unsyncedExtra.count : 0);

  const weekTotal =
    (remoteWeek ? Number(remoteWeek.total) : localWeekSummary.total) +
    (remoteWeek
      ? summarizeSales(
          localWeek.filter(
            (s) => s.syncStatus === "pending" || s.syncStatus === "error",
          ),
        ).total
      : 0);

  const chartDays: WeekChartDay[] = useMemo(() => {
    const maxBar = 96;
    const toBar = (
      label: string,
      amount: number,
      dateStr: string,
      max: number,
    ): WeekChartDay => {
      const isToday = dateStr === today;
      if (amount <= 0 && !isToday) {
        return { label, kind: "empty" };
      }
      if (amount <= 0) {
        return {
          label,
          kind: "today",
          height: 8,
          amountLabel: formatMoney(0),
        };
      }
      return {
        label,
        kind: isToday ? "today" : "past",
        height: Math.max(8, Math.round((amount / max) * maxBar)),
        amountLabel: formatMoney(amount),
      };
    };

    if (remoteWeek?.daily?.length === 7) {
      const max = Math.max(
        ...remoteWeek.daily.map((d) => Number(d.total)),
        1,
      );
      return remoteWeek.daily.map((day) =>
        toBar(day.label, Number(day.total), day.date, max),
      );
    }

    const amounts: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const dateStr = addDays(weekRange.from, i);
      const amount = summarizeSales(
        filterSalesByRange(localWeek, dayRange(dateStr)),
      ).total;
      amounts.push(amount);
    }
    const max = Math.max(...amounts, 1);
    return amounts.map((amount, i) =>
      toBar(
        WEEK_LABELS[i] ?? "L",
        amount,
        addDays(weekRange.from, i),
        max,
      ),
    );
  }, [remoteWeek, localWeek, today, weekRange.from]);

  const ranking =
    remoteTop && remoteTop.length > 0
      ? remoteTop.map((row) => ({
          rank: row.rank,
          name: `${row.product_name} · ${formatQuantity(Number(row.quantity), asUnit(row.unit))}`,
          amount: formatMoney(Number(row.total)),
          progress: Math.round(
            (Number(row.total) / Math.max(Number(remoteTop[0].total), 1)) *
              100,
          ),
        }))
      : localTop.map((row) => ({
          rank: row.rank,
          name: `${row.name} · ${formatQuantity(row.quantityMillis, row.unit, { asMillis: true })}`,
          amount: formatMoney(row.total),
          progress: Math.round(
            (row.total / Math.max(localTop[0]?.total ?? 1, 1)) * 100,
          ),
        }));

  const greeting = greetingForHour(bogotaHour());
  const title = formatLongDate(new Date());
  const todayIndex = chartDays.findIndex((d) => d.kind === "today");

  return (
    <AppShell active="inicio">
      <main className="tem-home">
        <div className="tem-on-green">
          <Header
            greeting={greeting}
            title={title}
            onMenuClick={() => navigate("/mas")}
          />
        </div>

        <Card hero overlap>
          <Stats
            eyebrow="Ventas de hoy"
            total={formatMoney(dayTotal)}
            delta={
              delta === null ? undefined : (
                <DeltaChip>
                  {delta > 0 ? `${delta}%` : `${delta}%`} vs. ayer
                </DeltaChip>
              )
            }
            items={[
              { value: String(dayCount), label: "ventas" },
              { value: formatMoney(dayAverage), label: "por venta" },
              {
                value: `${invoicesAccepted} de ${invoicesTotal}`,
                label: "facturas en la DIAN",
              },
            ]}
          />
        </Card>

        <div className="tem-home__body">
          <Button
            variant="primary"
            className="tem-home__cta"
            onClick={() => navigate("/venta")}
          >
            <IconPlus />
            Nueva venta
          </Button>

          <Card>
            <CardHead>
              <CardTitle>Esta semana</CardTitle>
              <span className="tem-home__week-total">
                {formatMoney(weekTotal)}
              </span>
            </CardHead>
            <WeekChart
              days={chartDays}
              selectedIndex={todayIndex >= 0 ? todayIndex : undefined}
            />
          </Card>

          <Card style={{ paddingBottom: 8 }}>
            <CardTitle className="tem-home__rank-title">
              Lo más vendido hoy
            </CardTitle>
            {ranking.length === 0 ? (
              <p className="tem-muted" role="status">
                Todavía no hay ventas hoy.
              </p>
            ) : (
              ranking.map((row) => (
                <RankRow
                  key={`${row.rank}-${row.name}`}
                  rank={row.rank}
                  name={row.name}
                  amount={row.amount}
                  progress={row.progress}
                />
              ))
            )}
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
