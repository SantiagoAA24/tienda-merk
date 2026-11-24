import type { HTMLAttributes } from "react";

import { Button } from "./Button";
import { cx } from "./cx";

export type RetryBannerProps = HTMLAttributes<HTMLDivElement> & {
  count: number;
  onRetry?: () => void;
  busy?: boolean;
};

export function RetryBanner({
  count,
  onRetry,
  busy = false,
  className,
  ...props
}: RetryBannerProps) {
  if (count <= 0) return null;
  const label =
    count === 1
      ? "1 factura por reenviar"
      : `${count} facturas por reenviar`;

  return (
    <div
      className={cx("tem-retry-banner", className)}
      role="status"
      {...props}
    >
      <div className="tem-retry-banner__copy">
        <div className="tem-retry-banner__title">{label}</div>
        <div className="tem-retry-banner__sub">Aún no llegan a la DIAN</div>
      </div>
      {onRetry ? (
        <Button
          variant="dark"
          type="button"
          onClick={onRetry}
          disabled={busy}
        >
          Reenviar
        </Button>
      ) : null}
    </div>
  );
}
