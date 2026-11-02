// Outline icons provided by the factory scaffold so every component shares one visual style.
// Usage: <Icon name="seats" className="h-5 w-5" />  (inherits text colour via currentColor)
import type { ReactNode, SVGProps } from "react";

const PATHS: Record<string, ReactNode> = {
  seats: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </>
  ),
  bags: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 11v6M16 11v6" />
    </>
  ),
  transmission: (
    <>
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="18" cy="5" r="1.5" />
      <circle cx="6" cy="19" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
      <path d="M6 6.5v11M12 6.5v11M18 6.5V12H6" />
    </>
  ),
  mileage: (
    <>
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <path d="M12 14l4-4" />
      <circle cx="12" cy="14" r="1" />
    </>
  ),
  fuel: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  electric: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  location: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  check: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </>
  ),
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  account: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.17 18.5a7 7 0 0 1 11.66 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  map: (
    <>
      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
      <path d="M8 2v16M16 6v16" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {PATHS[name]}
    </svg>
  );
}
