import type { NavItem, RenderNavLink } from "./types";
import { menuItemClass } from "./SideMenu";

export interface NavListProps<TTo extends string = string> {
  items: readonly NavItem<TTo>[];
  /** `id` of the item for the current page. */
  activeId?: string;
  renderLink: RenderNavLink<TTo>;
  /** Accessible name for the navigation landmark. */
  label: string;
  onNavigate?: () => void;
}

/** A list of links. How each link is built is left to `renderLink`, so no router is needed here. */
export function NavList<TTo extends string = string>({
  items,
  activeId,
  renderLink,
  label,
  onNavigate,
}: NavListProps<TTo>) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              {renderLink({
                item,
                active,
                className: menuItemClass({ active }),
                "aria-current": active ? "page" : undefined,
                onClick: onNavigate,
                children: item.label,
              })}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
