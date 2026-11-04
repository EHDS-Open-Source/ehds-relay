import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export interface BrandCardProps {
  /** Wordmark or logo shown at the top of the card. */
  logo?: ReactNode;
  title: string;
  description?: ReactNode;
  /** `wide` (620px) for a list of choices or a form; `narrow` (520px) otherwise. */
  width?: "narrow" | "wide";
  className?: string;
  children?: ReactNode;
}

/**
 * The blue card on the sign-in and organisation screens: logo, white title, text, then the
 * content. 520px wide (620px for `wide`), padding 56px 64px and a 28px radius; on phones
 * padding 40px 24px, a 22px radius and a smaller title and logo gap.
 */
export function BrandCard({
  logo,
  title,
  description,
  width = "narrow",
  className,
  children,
}: BrandCardProps) {
  return (
    <section
      data-slot="brand-card"
      data-surface="blue"
      data-width={width}
      className={cn(
        "relative w-full rounded-[22px] bg-blue px-6 py-10 text-white md:rounded-signin md:px-16 md:py-14",
        width === "wide" ? "max-w-[620px]" : "max-w-[520px]",
        className,
      )}
    >
      {logo ? <div className="mb-6 md:mb-10">{logo}</div> : null}
      <h1 className="text-[1.75em] leading-[1.2] font-semibold text-white md:text-[2.15em]">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-[1.1em] leading-[1.6] font-normal text-white [&_strong]:font-semibold">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className={description ? "mt-10" : "mt-8"}>{children}</div>
      ) : null}
    </section>
  );
}
