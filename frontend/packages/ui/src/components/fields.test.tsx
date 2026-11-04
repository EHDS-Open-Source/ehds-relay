import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FormMessage } from "./form-message";
import { Input } from "./input";
import { Label } from "./label";
import { NativeSelect } from "./native-select";

describe("form fields", () => {
  it("labels an input and takes typing", async () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </>,
    );
    await userEvent.type(screen.getByLabelText("Name"), "Acme");
    expect(screen.getByLabelText("Name")).toHaveValue("Acme");
  });

  it("selects an option", async () => {
    render(
      <>
        <Label htmlFor="c">Country</Label>
        <NativeSelect id="c" defaultValue="">
          <option value="">Choose</option>
          <option value="FR">France</option>
        </NativeSelect>
      </>,
    );
    await userEvent.selectOptions(screen.getByLabelText("Country"), "FR");
    expect(screen.getByLabelText("Country")).toHaveValue("FR");
  });

  it("announces errors but not info", () => {
    render(
      <>
        <FormMessage>Broken</FormMessage>
        <FormMessage tone="info">Hint</FormMessage>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Broken");
    expect(screen.getByText("Hint")).not.toHaveAttribute("role");
  });
});

describe("fields on blue", () => {
  it("uses the underline look: bold yellow text, white placeholder at 75%, yellow focus line", () => {
    render(<Input tone="onBlue" aria-label="Name" placeholder="e.g. Acme" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("data-tone", "onBlue");
    for (const name of [
      "border-b-2",
      "border-white",
      "font-semibold",
      "text-yellow",
      "placeholder:text-white/75",
      "focus:border-yellow",
      "aria-invalid:border-b-[3px]",
      "focus:aria-invalid:border-error",
    ]) {
      expect(input).toHaveClass(name);
    }
  });

  it("shows an unchosen select like a placeholder, with the yellow chevron", () => {
    render(
      <NativeSelect tone="onBlue" aria-label="Country" defaultValue="">
        <option value="">Select a country</option>
        <option value="FR">France</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox", { name: "Country" });
    expect(select).toHaveClass("native-select-on-blue");
    expect(select).toHaveClass("has-[option[value='']:checked]:text-white/75");
  });

  it("keeps the boxed look on white", () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveClass("rounded-field", "border-2", "h-[51px]");
    expect(input).not.toHaveClass("text-yellow");
  });
});
