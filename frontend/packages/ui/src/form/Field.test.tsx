import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field, fieldErrorId } from "./Field";
import { RadioChoices } from "./RadioChoices";

describe("Field", () => {
  it("labels a single input and shows its error", () => {
    render(
      <Field
        label="Title"
        htmlFor="title"
        anchorId="field-title"
        error="Too short"
      >
        <input id="title" aria-describedby={fieldErrorId("title")} />
      </Field>,
    );
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
      "Too short",
    );
    expect(document.getElementById("field-title")).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("groups several inputs under a legend", () => {
    render(
      <Field label="Structured data" anchorId="field-structured">
        <RadioChoices
          idPrefix="s"
          name="s"
          choices={[
            { value: "yes", label: "Yes", description: "Has columns" },
            { value: "no", label: "No" },
          ]}
        />
      </Field>,
    );
    const group = screen.getByRole("group", { name: "Structured data" });
    expect(group).toBeVisible();
    expect(screen.getByLabelText(/Yes/)).toHaveAccessibleDescription(
      "Has columns",
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});
