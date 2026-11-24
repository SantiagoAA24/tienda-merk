import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

function baseProps(
  size: number,
  strokeWidth: number,
  props: SVGProps<SVGSVGElement>,
) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };
}

export function IconPlus({ size = 26, strokeWidth = 3, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconCheck({
  size = 13,
  strokeWidth = 3.2,
  ...props
}: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconClock({
  size = 13,
  strokeWidth = 3,
  ...props
}: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconClose({
  size = 13,
  strokeWidth = 3,
  ...props
}: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconArrowUp({
  size = 14,
  strokeWidth = 3,
  ...props
}: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function IconCart({ size = 22, strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.76L20 8H6.2" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </svg>
  );
}

export function IconHome({ size = 22, strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function IconProducts({
  size = 22,
  strokeWidth = 2.2,
  ...props
}: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" />
    </svg>
  );
}

export function IconSales({
  size = 22,
  strokeWidth = 2.2,
  ...props
}: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, props)}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function IconMore({ size = 22, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}
