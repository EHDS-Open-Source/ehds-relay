import type { ReactNode } from "react";

import { Button } from "../components/button";
import { Icon } from "../icons";
import { messages } from "../messages";

export interface AppHeaderProps {
  /** Logo or product name, usually a link home. */
  logo: ReactNode;
  /** Shown beside the actions so people can tell which organisation they are in. */
  orgName?: string;
  /** Page actions placed before the menu button. On narrow screens they wrap to a second row. */
  actions?: ReactNode;
  /** Shows the round menu button when set. */
  onMenuClick?: () => void;
  menuOpen?: boolean;
  menuLabel?: string;
}

/** Solid blue bar: logo on the left, page actions, then the yellow menu button. */
export function AppHeader({
  logo,
  orgName,
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
      <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3 md:min-h-[72px] md:flex-nowrap md:px-[calc(2%+2.5rem)] md:py-0">
        <div className="mr-auto flex min-w-0 items-center">{logo}</div>
        {orgName ? (
          <span className="truncate font-semibold max-md:hidden">
            {orgName}
          </span>
        ) : null}
        {actions ? (
          <div className="order-3 flex w-full flex-wrap items-center gap-3 md:order-none md:w-auto md:flex-nowrap">
            {actions}
          </div>
        ) : null}
        {onMenuClick ? (
          <Button
            type="button"
            variant="icon"
            size="icon"
            onBlue
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
