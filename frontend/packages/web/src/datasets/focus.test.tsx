import { DatePicker } from "@ehds-relay/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { focusAnchor } from "./focus";

describe("focusAnchor", () => {
  it("focuses a date trigger, not the hidden input beside it", () => {
    render(
      <div id="field-when">
        <DatePicker id="when" name="when" value="" onChange={() => {}} />
      </div>,
    );
    focusAnchor("field-when");
    expect(screen.getByRole("button")).toHaveFocus();
  });

  it("focuses the first text input", () => {
    render(
      <div id="field-a">
        <input type="hidden" />
        <input aria-label="first" />
      </div>,
    );
    focusAnchor("field-a");
    expect(screen.getByLabelText("first")).toHaveFocus();
  });
});
