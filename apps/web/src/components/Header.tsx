import type { HTMLAttributes, ReactNode } from "react";

import { IconButton } from "./Button";
import { cx } from "./cx";
import { IconCart, IconMore } from "./icons";

export type HeaderProps = HTMLAttributes<HTMLElement> & {
  greeting: string;
  title: string;
  onMenuClick?: () => void;
  menuLabel?: string;
  brandName?: ReactNode;
};

export function Header({
  greeting,
  title,
  onMenuClick,
  menuLabel = "Más opciones",
  brandName = (
    <>
      Tienda Express <span>Merk</span>
    </>
  ),
  className,
  ...props
}: HeaderProps) {
  return (
    <header className={cx("tem-header", className)} {...props}>
      <div className="tem-header__row">
        <div className="tem-brand">
          <div className="tem-brand__mark">
            <IconCart />
          </div>
          <div className="tem-brand__name">{brandName}</div>
        </div>
        <IconButton aria-label={menuLabel} onClick={onMenuClick}>
          <IconMore />
        </IconButton>
      </div>
      <div>
        <div className="tem-greeting">{greeting}</div>
        <h1 className="tem-header__title">{title}</h1>
      </div>
    </header>
  );
}
