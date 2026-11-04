import type { ReactNode } from "react";
import { Button } from "../components/button";
import { Icon } from "../icons";
import { messages } from "../messages";

export interface AppHeaderProps {
  /** Logo or product name, usually a link home. */
  logo: ReactNode;
  /** Page actions placed before the menu button. On phones they move to a second row. */
  actions?: ReactNode;
  /** Shows the round menu button when set. */
  onMenuClick?: () => void;
  menuOpen?: boolean;
  menuLabel?: string;
}

/**
 * Solid blue bar: logo on the left, then page actions and the yellow menu button on the right.
 * 72px tall with the page's side margin (2% + 40px); on phones 64px with 16px sides, and the
 * actions wrap to their own row under the logo and menu.
 */
export function AppHeader({
  logo,
  actions,
  onMenuClick,
  menuOpen = false,
  menuLabel = messages.openMenu,
}: AppHeaderProps) {
  return (
    <header
      data-surface="blue"
      className="sticky top-0 z-30 bg-blue text-white"
    >
      <div className="flex min-h-16 flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 md:min-h-18 md:flex-nowrap md:px-[calc(2%+var(--space-40))] md:py-0">
        <div className="mr-auto flex min-w-0 items-center">{logo}</div>
        {actions ? (
          <div
            data-slot="header-actions"
            className="order-3 flex w-full flex-wrap items-center gap-2 md:order-none md:w-auto md:flex-nowrap"
          >
            {actions}
          </div>
        ) : null}
        {onMenuClick ? (
          <Button
            type="button"
            variant="icon"
            size="icon"
            onBlue
            className="max-md:size-[38px]"
            aria-label={menuLabel}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={onMenuClick}
          >
            <Icon name="menu" size="md" />
          </Button>
        ) : null}
      </div>
    </header>
  );
}
