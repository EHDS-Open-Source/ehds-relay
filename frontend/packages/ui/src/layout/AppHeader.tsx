import type { ReactNode } from "react";

import { Button } from "../components/button";
import { messages } from "../messages";

export interface AppHeaderProps {
  /** Logo or product name, usually a link home. */
  logo: ReactNode;
  orgName?: string;
  /** Extra controls placed before the menu button. */
  actions?: ReactNode;
  /** Shows the round menu button when set. */
  onMenuClick?: () => void;
  menuOpen?: boolean;
  menuLabel?: string;
}

export function AppHeader({
  logo,
  orgName,
  actions,
  onMenuClick,
  menuOpen = false,
  menuLabel = messages.openMenu,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-8">
      <div className="flex min-w-0 items-center">{logo}</div>
      <div className="flex items-center gap-3">
        {orgName ? (
          <span className="truncate text-sm font-medium text-muted-foreground">
            {orgName}
          </span>
        ) : null}
        {actions}
        {onMenuClick ? (
          <Button
            type="button"
            size="icon"
            className="size-10 rounded-full text-lg"
            aria-label={menuLabel}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={onMenuClick}
          >
            <span aria-hidden="true">⋯</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
