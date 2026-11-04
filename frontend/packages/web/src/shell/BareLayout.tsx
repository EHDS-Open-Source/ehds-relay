import { BrandCard } from "@ehds-relay/ui";
import type { ReactNode } from "react";

import { Logo } from "./Logo";

/**
 * The ring of stars: fixed to the window centre, about 88% of the window width (at least
 * 1100px). The artwork is neutral yellow at varying strength, not the dataset star palette.
 */
function StarRing() {
  return (
    <img
      src="/stars.svg"
      alt=""
      aria-hidden="true"
      data-slot="star-ring"
      className="star-ring pointer-events-none fixed top-1/2 left-1/2 aspect-[2266/2165] w-[max(88.5vw,1100px)] max-w-none -translate-x-1/2 -translate-y-1/2"
    />
  );
}

/** A line on white under the card, such as "Don't have an organisation? Create one". */
export function BelowCard({ children }: { children: ReactNode }) {
  return (
    <p
      data-slot="below-card"
      className="w-full max-w-[620px] text-center text-base leading-[1.6] font-semibold text-ink"
    >
      {children}
    </p>
  );
}

/** Class for the link or button in a `BelowCard` line: blue, underlined only on hover. */
export const belowCardLinkClass =
  "font-semibold text-blue no-underline decoration-2 underline-offset-[3px] hover:underline";

/** White page without the app header, for sign-in and organisation selection. */
export function BareLayout({
  children,
  title,
  description,
  width = "narrow",
  below,
}: {
  children: ReactNode;
  /** When given, the content sits on the blue card under this title. */
  title?: string;
  description?: ReactNode;
  /** 520px card, or 620px for the organisation list and the new organisation form. */
  width?: "narrow" | "wide";
  /** Shown on white under the card, e.g. a `BelowCard` line. */
  below?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <StarRing />
      <main
        id="content"
        className={`relative flex min-h-screen w-full flex-col items-center gap-6 px-4 py-6 md:justify-center md:px-5 md:py-12 ${title ? "" : "justify-center"}`}
      >
        {title ? (
          <BrandCard
            logo={<Logo size="card" />}
            title={title}
            description={description}
            width={width}
          >
            {children}
          </BrandCard>
        ) : (
          <div className="w-full max-w-xl">{children}</div>
        )}
        {below}
      </main>
    </div>
  );
}
