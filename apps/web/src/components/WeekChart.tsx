import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export type WeekChartDay = {
  label: string;
  /** Bar height in px; omit or 0 for empty/future days. */
  height?: number;
  kind?: "past" | "today" | "empty";
  amountLabel?: string;
};

export type WeekChartProps = HTMLAttributes<HTMLDivElement> & {
  days: WeekChartDay[];
  selectedIndex?: number;
  onSelectDay?: (index: number) => void;
};

const MAX_BAR_HEIGHT = 96;

export function WeekChart({
  days,
  selectedIndex,
  onSelectDay,
  className,
  ...props
}: WeekChartProps) {
  const interactive = Boolean(onSelectDay);
  const summary = days
    .map((day) =>
      day.amountLabel
        ? `${day.kind === "today" ? "Hoy" : day.label}: ${day.amountLabel}`
        : day.kind === "today"
          ? "Hoy"
          : day.label,
    )
    .join(", ");

  return (
    <div className={cx(className)} {...props}>
      <div
        className="tem-chart"
        role={interactive ? "group" : "img"}
        aria-label={`Ventas de la semana. ${summary}`}
      >
        {days.map((day, index) => {
          const kind = day.kind ?? (day.height ? "past" : "empty");
          const height =
            kind === "empty"
              ? undefined
              : Math.max(0, Math.min(MAX_BAR_HEIGHT, day.height ?? 0));
          const selected = selectedIndex === index;
          const barLabel = day.amountLabel
            ? `${day.kind === "today" ? "Hoy" : day.label}: ${day.amountLabel}`
            : day.kind === "today"
              ? "Hoy"
              : day.label;

          const bar = (
            <div
              className={cx(
                "tem-chart__bar",
                kind === "today" && "tem-chart__bar--today",
                kind === "empty" && "tem-chart__bar--empty",
              )}
              style={kind === "empty" ? undefined : { height: `${height ?? 0}px` }}
            />
          );

          return (
            <div key={`${day.label}-${index}`} className="tem-chart__col">
              {interactive ? (
                <button
                  type="button"
                  aria-label={barLabel}
                  aria-pressed={selected}
                  onClick={() => onSelectDay?.(index)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    height: "100%",
                    width: "100%",
                    border: 0,
                    padding: 0,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {bar}
                </button>
              ) : (
                bar
              )}
            </div>
          );
        })}
      </div>
      <div className="tem-chart__labels" aria-hidden>
        {days.map((day, index) => (
          <div
            key={`label-${day.label}-${index}`}
            className={cx(day.kind === "today" && "is-today")}
          >
            {day.kind === "today" ? "Hoy" : day.label}
          </div>
        ))}
      </div>
    </div>
  );
}
