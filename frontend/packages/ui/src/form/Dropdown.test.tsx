import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "../components/label";
import { Dropdown, type DropdownProps } from "./Dropdown";
import { Field } from "./Field";

const options = [
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "EL", label: "Greece" },
];

function Harness({
  initial = "",
  onChange,
  ...props
}: Partial<DropdownProps> & {
  initial?: string;
  onChange?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Label htmlFor="c">Country</Label>
      <Dropdown
        id="c"
        value={value}
        placeholder="Choose"
        options={options}
        onValueChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        {...props}
      />
    </>
  );
}

// While the list is open Radix hides the rest of the page from assistive technology.
const trigger = () =>
  screen.getByRole("combobox", { name: "Country", hidden: true });
const highlighted = () =>
  within(screen.getByRole("listbox"))
    .getAllByRole("option")
    .find((o) => o.hasAttribute("data-highlighted"));

describe("Dropdown", () => {
  it("is named by its label and shows the placeholder without listing it", async () => {
    render(<Harness />);
    expect(trigger()).toHaveTextContent("Choose");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    expect(names).toEqual(["Finland", "France", "Germany", "Greece"]);
  });

  it("is named by aria-label", () => {
    render(
      <Dropdown
        aria-label="Role"
        value="FR"
        options={options}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Role" })).toHaveTextContent(
      "France",
    );
  });

  it("is described by the field hint and error", () => {
    render(
      <Field label="Country" htmlFor="c" hint="Where you work" error="Required">
        <Dropdown
          id="c"
          value=""
          options={options}
          onValueChange={() => {}}
          aria-invalid
        />
      </Field>,
    );
    const description = screen
      .getByRole("combobox", { name: /Country/ })
      .getAttribute("aria-describedby");
    expect(description).toContain("c-hint");
    expect(description).toContain("c-error");
    expect(screen.getByRole("combobox", { name: /Country/ })).toHaveClass(
      "aria-invalid:border-destructive",
    );
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
    ["ArrowDown", "{ArrowDown}"],
    ["ArrowUp", "{ArrowUp}"],
  ])("opens with %s", async (_name, keys) => {
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard(keys);
    expect(screen.getByRole("listbox")).toBeVisible();
  });

  it("moves the highlight with arrows, Home and End", async () => {
    render(<Harness initial="FR" />);
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    expect(highlighted()).toHaveTextContent("France");
    await userEvent.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Germany");
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(highlighted()).toHaveTextContent("Finland");
    await userEvent.keyboard("{End}");
    expect(highlighted()).toHaveTextContent("Greece");
    await userEvent.keyboard("{Home}");
    expect(highlighted()).toHaveTextContent("Finland");
  });

  it("chooses with Enter once, closes and returns focus", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("FR");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveTextContent("France");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("option", { name: "France" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("closes with Escape without a change and returns focus", async () => {
    const onChange = vi.fn();
    render(<Harness initial="DE" onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard("{Enter}{ArrowDown}{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveTextContent("Germany");
  });

  it("jumps to the first match when typing in the open list", async () => {
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("fr");
    expect(highlighted()).toHaveTextContent("France");
  });

  it("changes the value when typing on the closed trigger", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard("gr");
    expect(onChange).toHaveBeenLastCalledWith("EL");
  });

  it("chooses with the pointer", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Germany" }));
    expect(onChange).toHaveBeenCalledWith("DE");
    expect(trigger()).toHaveTextContent("Germany");
  });

  it("does not open when disabled", async () => {
    render(<Harness disabled />);
    await userEvent.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("puts its name and value in the submitted form", () => {
    render(
      <form data-testid="form">
        <Harness initial="FR" name="country" />
      </form>,
    );
    const data = new FormData(screen.getByTestId<HTMLFormElement>("form"));
    expect(data.get("country")).toBe("FR");
  });

  it("has the boxed, on-blue and compact looks", () => {
    const { rerender } = render(<Harness />);
    expect(trigger()).toHaveClass(
      "h-[51px]",
      "rounded-field",
      "border-2",
      "pr-12",
    );
    rerender(<Harness tone="onBlue" />);
    expect(trigger()).toHaveClass("border-b-2", "text-yellow", "pr-8");
    rerender(<Harness size="compact" />);
    expect(trigger()).toHaveClass("h-[34px]", "pr-10");
  });
});
