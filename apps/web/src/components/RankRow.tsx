import type { HTMLAttributes } from "react";

import { cx } from "./cx";

export type RankRowProps = HTMLAttributes<HTMLDivElement> & {
  rank: number;
  name: string;
  amount: string;
  /** Progress width from 0 to 100. */
  progress: number;
};

export function RankRow({
  rank,
  name,
  amount,
  progress,
  className,
  ...props
}: RankRowProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className={cx("tem-rank-row", className)} {...props}>
      <div className="tem-rank" aria-hidden>
        {rank}
      </div>
      <div className="tem-rank-row__body">
        <div className="tem-rank-row__line">
          <span>{name}</span>
          <span>{amount}</span>
        </div>
        <div
          className="tem-meter"
          role="meter"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${name}: ${amount}`}
        >
          <span style={{ width: `${clamped}%` }} />
        </div>
      </div>
    </div>
  );
}
