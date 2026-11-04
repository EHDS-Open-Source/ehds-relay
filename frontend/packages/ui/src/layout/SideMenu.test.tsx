import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppHeader } from "./AppHeader";
import { SideMenu, SideMenuItem } from "./SideMenu";

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
});
