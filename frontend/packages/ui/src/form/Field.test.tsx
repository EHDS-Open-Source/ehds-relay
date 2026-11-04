import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "../components/input";
import { Field, fieldErrorId, fieldHintId } from "./Field";
import { RadioChoices } from "./RadioChoices";
import { RepeatableList } from "./RepeatableList";
import { SaveButton } from "./SaveButton";

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
    expect(star).toHaveClass("text-required");
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

  it("shows a hint in the blue hint colour with an icon that an input can reference", () => {
    render(
      <Field label="Code" htmlFor="c" hint="Use the short code">
        <input id="c" aria-describedby={fieldHintId("c")} />
      </Field>,
    );
    expect(screen.getByLabelText("Code")).toHaveAccessibleDescription(
      "Use the short code",
    );
    expect(document.querySelector('[data-icon="info"]')).not.toBeNull();
    expect(screen.getByText("Use the short code").parentElement).toHaveClass(
      "text-blue-hint",
    );
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

  it("puts the hint after the input and describes the input by its error and hint", () => {
    render(
      <Field
        label="Email"
        htmlFor="e"
        hint="We email a link."
        error="Enter an email."
      >
        <Input id="e" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription(
      "Enter an email. We email a link.",
    );
    const hint = screen.getByText("We email a link.").parentElement!;
    // The input comes first, then the error, then the hint
    expect(
      input.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(hint.previousElementSibling).toHaveAttribute(
      "data-slot",
      "form-message",
    );
  });

  it("sizes the required star with the label text", () => {
    render(
      <Field label="Title" htmlFor="t" required>
        <input id="t" />
      </Field>,
    );
    expect(document.querySelector('[data-slot="required-star"]')).toHaveClass(
      "size-[0.72em]",
    );
  });

  it("turns a group's star magenta while something inside it is wrong", () => {
    render(
      <Field label="Contact" anchorId="contact" required invalid>
        <Field label="Email" htmlFor="ce" error="Enter an email.">
          <Input id="ce" />
        </Field>
      </Field>,
    );
    const [groupStar] = document.querySelectorAll(
      '[data-slot="required-star"]',
    );
    expect(groupStar).toHaveClass("text-destructive");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter an email.",
    );
  });

  it("shows a list's message under its Add button and points the group at it", () => {
    render(
      <Field
        label="Legislation"
        anchorId="leg"
        required
        invalid
        describedBy="leg-error"
      >
        <RepeatableList
          items={[]}
          renderItem={() => null}
          onAdd={() => undefined}
          onRemove={() => undefined}
          addLabel="Add another"
          error="Add at least one."
          errorId="leg-error"
        />
      </Field>,
    );
    expect(
      screen.getByRole("group", { name: /Legislation/ }),
    ).toHaveAccessibleDescription("Add at least one.");
    const add = screen.getByRole("button", { name: "Add another" });
    expect(add).toHaveClass("border-destructive");
    expect(
      add.compareDocumentPosition(screen.getByRole("alert")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("SaveButton", () => {
  it("puts the save icon after the label, then shows Saved in the success colours", () => {
    const { rerender } = render(
      <SaveButton
        label="Save changes"
        busyLabel="Saving…"
        savedLabel="Saved"
      />,
    );
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button.lastElementChild).toHaveAttribute("data-icon", "save");
    rerender(
      <SaveButton
        label="Save changes"
        busyLabel="Saving…"
        savedLabel="Saved"
        busy
      />,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Saving…");
    rerender(
      <SaveButton
        label="Save changes"
        busyLabel="Saving…"
        savedLabel="Saved"
        saved
      />,
    );
    const saved = screen.getByRole("button", { name: "Saved" });
    expect(saved).toHaveClass("bg-success-bg", "text-success-on-white");
    expect(saved.lastElementChild).toHaveAttribute("data-icon", "tick");
  });
});
