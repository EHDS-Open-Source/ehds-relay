import { BrandCard, Icon, STAR_PALETTE } from "@ehds-relay/ui";
import type { ReactNode } from "react";

import { Logo } from "./Logo";

const RING_STARS = 16;

/**
 * Stand-in for the ring of stars: fixed to the window centre, about 88% of the window
 * width (at least 1100px). Swap in the supplied artwork here.
 */
function StarRing() {
  return (
    <div
      aria-hidden="true"
      data-slot="star-ring"
      className="star-ring pointer-events-none fixed top-1/2 left-1/2 aspect-square w-[max(88vw,1100px)] -translate-x-1/2 -translate-y-1/2"
    >
      {Array.from({ length: RING_STARS }, (_, index) => {
        const angle = (2 * Math.PI * index) / RING_STARS;
        return (
          <span
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${String(50 + 46 * Math.sin(angle))}%`,
              top: `${String(50 - 46 * Math.cos(angle))}%`,
              color: STAR_PALETTE[index % STAR_PALETTE.length],
            }}
          >
            <Icon
              name="star"
              className="size-12"
              style={{ width: 48, height: 48 }}
            />
          </span>
        );
      })}
    </div>
  );
}

/** White page without the app header, for sign-in and organisation selection. */
export function BareLayout({
  children,
  title,
  description,
  width = "narrow",
}: {
  children: ReactNode;
  /** When given, the content sits on the blue card under this title. */
  title?: string;
  description?: ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <StarRing />
      <main
        id="content"
        className={`relative mx-auto flex min-h-screen w-full flex-col justify-center gap-6 px-4 py-12 sm:px-6 ${width === "wide" ? "max-w-2xl" : "max-w-xl"}`}
      >
        {title ? (
          <BrandCard logo={<Logo />} title={title} description={description}>
            {children}
          </BrandCard>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
