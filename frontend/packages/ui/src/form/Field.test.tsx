import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "../components/input";
import { Field, fieldErrorId, fieldHintId } from "./Field";
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

  it("marks a required field with a star and hidden text, magenta once it has an error", () => {
    const { rerender } = render(
      <Field label="Title" htmlFor="t" required>
        <input id="t" />
      </Field>,
    );
    expect(screen.getByLabelText(/Title/)).toBeVisible();
    expect(screen.getByText("(required)")).toHaveClass("sr-only");
    const star = document.querySelector('[data-slot="required-star"]');
    expect(star).toHaveClass("text-[color:var(--required)]");
    rerender(
      <Field label="Title" htmlFor="t" required error="Enter a title.">
        <input id="t" />
      </Field>,
    );
    expect(document.querySelector('[data-slot="required-star"]')).toHaveClass(
      "text-destructive",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a title.");
  });

  it("uses the pink error and yellow star on blue", () => {
    render(
      <Field
        label="Name"
        htmlFor="n"
        required
        error="Enter a name."
        tone="onBlue"
      >
        <Input
          id="n"
          tone="onBlue"
          aria-invalid
          aria-describedby={fieldErrorId("n")}
        />
      </Field>,
    );
    expect(document.querySelector('[data-slot="required-star"]')).toHaveClass(
      "text-error",
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
      "Enter a name.",
    );
  });

  it("shows a hint with an icon that an input can reference", () => {
    render(
      <Field label="Code" htmlFor="c" hint="Use the short code">
        <input id="c" aria-describedby={fieldHintId("c")} />
      </Field>,
    );
    expect(screen.getByLabelText("Code")).toHaveAccessibleDescription(
      "Use the short code",
    );
    expect(document.querySelector('[data-icon="info"]')).not.toBeNull();
  });

  it("points a group at its error", () => {
    render(
      <Field label="Kind" anchorId="kind" error="Choose one." required>
        <RadioChoices
          idPrefix="k"
          name="k"
          choices={[{ value: "a", label: "A" }]}
        />
      </Field>,
    );
    expect(
      screen.getByRole("group", { name: /Kind/ }),
    ).toHaveAccessibleDescription("Choose one.");
  });
});
