import { Link } from "react-router-dom";

import { IconBack } from "./icons";

export type BackHeaderProps = {
  title: string;
  to: string;
  backLabel?: string;
};

export function BackHeader({
  title,
  to,
  backLabel = "Volver",
}: BackHeaderProps) {
  return (
    <div className="tem-backheader">
      <Link to={to} className="tem-backheader__back" aria-label={backLabel}>
        <IconBack />
      </Link>
      <h1 className="tem-backheader__title">{title}</h1>
    </div>
  );
}
