import type { ReactNode } from "react";

import { cn } from "../lib/utils";
import { Icon, type IconName } from "../icons";
import { messages } from "../messages";

export type BannerTone = "success" | "info" | "warning" | "error";

export interface BannerProps {
  tone?: BannerTone;
  children: ReactNode;
  /** A secondary action, e.g. a button. */
  action?: ReactNode;
  /** Shows a close button. Leave out for conditions that cannot be dismissed. */
  onDismiss?: () => void;
  className?: string;
}

const icons: Record<BannerTone, IconName> = {
  success: "tickCircle",
  info: "info",
  warning: "warning",
  error: "star",
};

const tones: Record<BannerTone, string> = {
  success: "bg-success-bg [&_[data-slot=icon]]:text-success-on-white",
  info: "bg-info-bg [&_[data-slot=icon]]:text-info-on-white",
  warning: "bg-warning-bg [&_[data-slot=icon]]:text-warning-on-white",
  error: "bg-error-bg [&_[data-slot=icon]]:text-error-on-white",
};

/**
 * A lasting message about the whole page (e.g. offline), placed under the header. Not for a
 * section of a page: say that in the section itself.
 */
export function Banner({
  tone = "info",
  children,
  action,
  onDismiss,
  className,
}: BannerProps) {
  return (
    <div
      // Errors and warnings interrupt; the rest wait for a pause.
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      data-slot="banner"
      data-tone={tone}
      className={cn(
        "flex items-center gap-4 rounded-card py-4 pr-4 pl-5 text-[0.95em] leading-[1.45] font-semibold text-ink max-md:flex-wrap",
        tones[tone],
        className,
      )}
    >
      <Icon name={icons[tone]} style={{ width: 22, height: 22 }} />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onDismiss ? (
        <button
          type="button"
          aria-label={messages.feedback.dismiss}
          className="inline-flex shrink-0 rounded-full p-2 text-ink hover:bg-black/6"
          onClick={onDismiss}
        >
          <Icon name="close" size="sm" />
        </button>
      ) : null}
    </div>
  );
}
