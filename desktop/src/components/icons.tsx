import type { SVGProps } from "react";

/**
 * Thin-stroke, non-filled icons. Stroke width 1.25 for a precise engineered look.
 * All icons accept standard SVG props so size/colour are controlled via CSS.
 */

const base = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconTerminal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="1.5" y="3" width="13" height="10" />
      <polyline points="4,7 6.5,9 4,11" />
      <line x1="8" y1="11" x2="12" y2="11" />
    </svg>
  );
}

export function IconList(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <line x1="3" y1="4" x2="13" y2="4" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="3" y1="12" x2="13" y2="12" />
    </svg>
  );
}

export function IconReport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 1.5 H10 L12.5 4 V14.5 H3.5 Z" />
      <polyline points="10,1.5 10,4 12.5,4" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" />
      <line x1="5.5" y1="10.5" x2="10.5" y2="10.5" />
    </svg>
  );
}

export function IconPlay(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <polygon points="4.5,3 12.5,8 4.5,13" />
    </svg>
  );
}

export function IconStop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="8" height="8" />
    </svg>
  );
}

export function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M13 8 A5 5 0 1 1 8 3" />
      <polyline points="13,3 13,6 10,6" />
    </svg>
  );
}

export function IconCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="5" />
    </svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <polyline points="3,8.5 6.5,12 13,4" />
    </svg>
  );
}

export function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2 L14.5 13.5 H1.5 Z" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" />
      <circle cx="8" cy="11.5" r="0.25" />
    </svg>
  );
}

export function IconChip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="8" height="8" />
      <line x1="6.5" y1="1.5" x2="6.5" y2="4" />
      <line x1="9.5" y1="1.5" x2="9.5" y2="4" />
      <line x1="6.5" y1="12" x2="6.5" y2="14.5" />
      <line x1="9.5" y1="12" x2="9.5" y2="14.5" />
      <line x1="1.5" y1="6.5" x2="4" y2="6.5" />
      <line x1="1.5" y1="9.5" x2="4" y2="9.5" />
      <line x1="12" y1="6.5" x2="14.5" y2="6.5" />
      <line x1="12" y1="9.5" x2="14.5" y2="9.5" />
    </svg>
  );
}
