import { NavList, SideMenu, SideMenuLogOut } from "@ehds-relay/ui";
import { useLocation } from "@tanstack/react-router";

import type { SessionOrg } from "../session/types";
import { useSession, useSignOut } from "../session/useSession";
import { shellMessages } from "./messages";
import { activeNavId, menuNavItems, navLabels } from "./nav";
import { renderMenuLink } from "./RouterLink";

/**
 * The blue menu panel: the organisation's name (when there is one), one list of links,
 * and Log out.
 */
export function ShellMenu({
  open,
  onOpenChange,
  org,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The organisation being worked in; leave out on pages outside any organisation. */
  org?: SessionOrg;
}) {
  const session = useSession();
  const signOutAndLeave = useSignOut();
  const pathname = useLocation({ select: (location) => location.pathname });
  const items = menuNavItems({
    role: org?.role,
    orgCount: session?.orgs.length ?? 0,
  });
  const close = () => {
    onOpenChange(false);
  };

  return (
    <SideMenu
      open={open}
      onOpenChange={onOpenChange}
      title={shellMessages.menuTitle}
      description={org?.name}
    >
      <NavList
        label={navLabels.main}
        items={items}
        activeId={activeNavId(items, org?.id, pathname)}
        renderLink={renderMenuLink(org?.id)}
        onNavigate={close}
      />
      <SideMenuLogOut
        onClick={() => {
          close();
          void signOutAndLeave();
        }}
      >
        {shellMessages.logOut}
      </SideMenuLogOut>
    </SideMenu>
  );
}
