import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppHeader } from "./AppHeader";
import { SideMenu, SideMenuItem, SideMenuLogOut } from "./SideMenu";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppHeader
        logo="Relay"
        menuOpen={open}
        onMenuClick={() => setOpen(true)}
      />
      <SideMenu
        open={open}
        onOpenChange={setOpen}
        description="Acme"
        footer={<p>API ok</p>}
      >
        <SideMenuItem>Log out</SideMenuItem>
      </SideMenu>
    </>
  );
}

describe("SideMenu", () => {
  it("returns focus to the menu button when closed with Esc", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Open menu" });
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("is closed until the menu button is pressed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens as a labelled dialog from the menu button", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription("Acme");
    expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
    expect(screen.getByText("API ok")).toBeVisible();
  });

  it("closes with the close button", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Esc", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the overlay is clicked", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const overlay = document.querySelector("[data-state='open'].fixed.inset-0");
    expect(overlay).not.toBeNull();
    await userEvent.click(overlay!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("draws Log out as a content-width pill with the exit icon after the label", () => {
    render(<SideMenuLogOut>Log out</SideMenuLogOut>);
    const button = screen.getByRole("button", { name: "Log out" });
    expect(button).toHaveClass("self-start", "h-12");
    expect(button.lastElementChild).toHaveAttribute("data-icon", "logOut");
  });
});

describe("AppHeader", () => {
  it("puts page actions before the menu button", () => {
    render(
      <AppHeader
        logo="Relay"
        actions={<a href="/back">Back</a>}
        onMenuClick={() => {}}
      />,
    );
    const back = screen.getByRole("link", { name: "Back" });
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(
      back.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
