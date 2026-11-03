import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NavList } from "./NavList";
import type { NavItem, RenderNavLink } from "./types";

const items: NavItem[] = [
  { id: "catalogue", label: "Catalogue", to: "#catalogue" },
  { id: "members", label: "Members", to: "#members" },
];

const renderLink: RenderNavLink = ({ item, children, ...rest }) => (
  <a href={item.to} data-testid={`link-${item.id}`} {...rest}>
    {children}
  </a>
);

describe("NavList", () => {
  it("renders each item through the supplied renderLink", () => {
    render(<NavList label="Main" items={items} renderLink={renderLink} />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Catalogue" })).toHaveAttribute(
      "href",
      "#catalogue",
    );
    expect(screen.getByTestId("link-members")).toHaveTextContent("Members");
  });

  it("marks only the active item", () => {
    render(
      <NavList
        label="Main"
        items={items}
        activeId="members"
        renderLink={renderLink}
      />,
    );
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Catalogue" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("calls onNavigate when a link is followed", async () => {
    const onNavigate = vi.fn();
    render(
      <NavList
        label="Main"
        items={items}
        renderLink={(props) => renderLink({ ...props, onClick: onNavigate })}
      />,
    );
    await userEvent.click(screen.getByRole("link", { name: "Catalogue" }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
