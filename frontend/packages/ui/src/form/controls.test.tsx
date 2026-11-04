import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RadioChoices } from "./RadioChoices";
import { Checkbox } from "./Checkbox";
import { Toggle } from "./Toggle";

describe("Checkbox", () => {
  it("is a native checkbox with its label and hint", async () => {
    render(
      <Checkbox id="c" label="Send me updates" description="Once a month" />,
    );
    const box = screen.getByRole("checkbox", { name: /Send me updates/ });
    expect(box).toHaveAccessibleDescription("Once a month");
    await userEvent.click(screen.getByText("Send me updates"));
    expect(box).toBeChecked();
  });
});

describe("Toggle", () => {
  it("is announced as a switch and flips with the keyboard", async () => {
    render(<Toggle id="t" label="Notifications" />);
    const sw = screen.getByRole("switch", { name: "Notifications" });
    expect(sw).not.toBeChecked();
    sw.focus();
    await userEvent.keyboard(" ");
    expect(sw).toBeChecked();
  });
});

describe("disabled controls", () => {
  it("disables a radio and dims it on blue", () => {
    render(
      <RadioChoices
        idPrefix="d"
        name="d"
        tone="onBlue"
        disabled
        choices={[{ value: "a", label: "A" }]}
      />,
    );
    const radio = screen.getByRole("radio");
    expect(radio).toBeDisabled();
    expect(radio.className).toContain("disabled:opacity-50");
    expect(radio.className).toContain("disabled:cursor-not-allowed");
  });
});
