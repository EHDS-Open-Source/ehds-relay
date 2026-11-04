import type { ReactNode } from "react";

// Drawn stand-ins for the brand icon set, all on a 24 x 24 box and coloured with
// currentColor. When the supplied artwork arrives, replace the entries here and nothing
// else changes. Keep this the only module that holds icon artwork.

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Six rounded arms through the centre: the brand asterisk. */
const starArms = (
  <g stroke="currentColor" strokeWidth="4.2" strokeLinecap="round">
    <path d="M12 3v18" />
    <path d="M4.2 7.5l15.6 9" />
    <path d="M4.2 16.5l15.6-9" />
  </g>
);

export const glyphs = {
  star: starArms,
  back: <path {...stroke} d="M20 12H5m6-6-6 6 6 6" />,
  next: <path {...stroke} d="M4 12h15m-6-6 6 6-6 6" />,
  edit: <path {...stroke} d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />,
  save: <path {...stroke} d="M5 4h11l3 3v13H5V4zM8 4v5h7V4M8 20v-6h8v6" />,
  search: (
    <g {...stroke}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </g>
  ),
  remove: (
    <g {...stroke}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 9h5" />
    </g>
  ),
  addUser: (
    <g {...stroke}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M19 6v6m-3-3h6" />
    </g>
  ),
  transfer: (
    <g {...stroke}>
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 18c0-3 2.4-5 5.5-5M13 17h8m-3-3 3 3-3 3" />
    </g>
  ),
  billing: (
    <g {...stroke}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M7 15h4" />
    </g>
  ),
  calendar: (
    <g {...stroke}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4m8-4v4" />
    </g>
  ),
  plus: <path {...stroke} d="M12 5v14M5 12h14" />,
  close: <path {...stroke} d="M6 6l12 12M18 6 6 18" />,
  menu: <path {...stroke} d="M4 7h16M4 12h16M4 17h16" />,
  more: (
    <g fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </g>
  ),
  chevronDown: <path {...stroke} d="m5 9 7 7 7-7" />,
  tick: <path {...stroke} d="m4.5 12.5 5 5 10-11" />,
  info: (
    <g {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.1" />
    </g>
  ),
  warning: (
    <g {...stroke}>
      <path d="M12 3.5 22 20H2L12 3.5z" />
      <path d="M12 10v5M12 17.5v.1" />
    </g>
  ),
  pin: (
    <g {...stroke}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </g>
  ),
  eye: (
    <g {...stroke}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  ),
  tag: (
    <g {...stroke}>
      <path d="M3 12.5V4h8.5L21 13.5 13.5 21 3 12.5z" />
      <path d="M7.5 8.5v.1" />
    </g>
  ),
  file: <path {...stroke} d="M6 3h8l5 5v13H6V3zM14 3v5h5" />,
  person: (
    <g {...stroke}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </g>
  ),
  signIn: <path {...stroke} d="M14 4h6v16h-6M3 12h12m-4-4 4 4-4 4" />,
  logOut: <path {...stroke} d="M10 4H4v16h6m4-12 4 4-4 4m4-4H8" />,
  account: (
    <g {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18c1.2-2 3-3 5.5-3s4.3 1 5.5 3" />
    </g>
  ),
  orgChart: (
    <g {...stroke}>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </g>
  ),
  switch: <path {...stroke} d="M4 8h14m-3-3 3 3-3 3M20 16H6m3-3-3 3 3 3" />,
  eraser: <path {...stroke} d="M4 15 14 5l6 6-8 8H8l-4-4zM9 10l6 6M12 20h8" />,
  lock: (
    <g {...stroke}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </g>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;
