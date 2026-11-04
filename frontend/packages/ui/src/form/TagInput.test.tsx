import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { TagInput } from "./TagInput";

const noun = { one: "keyword", many: "keywords" };

function Harness({ initial = [] as string[], onSubmit = vi.fn() }) {
  const [tags, setTags] = useState(initial);
  return (
    <form onSubmit={onSubmit}>
      <Field label="Keywords" htmlFor="kw" hint="Press Enter to add.">
        <TagInput id="kw" value={tags} onChange={setTags} noun={noun} />
      </Field>
      <span data-testid="tags">{tags.join("|")}</span>
    </form>
  );
}

const tags = () => screen.getByTestId("tags");
const box = () => screen.getByLabelText("Keywords");
const status = () => screen.getByRole("status");

describe("TagInput", () => {
  it("adds a tag on Enter or a comma without submitting the form", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await userEvent.type(box(), " oncology {Enter}cancer,");
    expect(tags()).toHaveTextContent("oncology|cancer");
    expect(box()).toHaveValue("");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent("Added keyword “cancer”.");
  });

  it("says what to type next once there is a tag", async () => {
    render(<Harness />);
    expect(box()).toHaveAttribute("placeholder", "Type and press Enter");
    await userEvent.type(box(), "a{Enter}");
    expect(box()).toHaveAttribute("placeholder", "Add another keyword");
  });

  it("adds each item of a pasted comma-separated list", () => {
    render(<Harness initial={["EHDS"]} />);
    fireEvent.paste(box(), {
      clipboardData: { getData: () => "cancer, oncology ,, registry" },
    });
    expect(tags()).toHaveTextContent("EHDS|cancer|oncology|registry");
    expect(status()).toHaveTextContent("Added 3 keywords.");
  });

  it("ignores repeats whatever their capitals, and says so", async () => {
    render(<Harness initial={["EHDS"]} />);
    await userEvent.type(box(), "ehds{Enter}  {Enter}");
    expect(tags()).toHaveTextContent(/^EHDS$/);
    expect(status()).toHaveTextContent("“ehds” is already added.");
  });

  it("removes a tag with its button", async () => {
    render(<Harness initial={["a", "b", "c"]} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove keyword b" }),
    );
    expect(tags()).toHaveTextContent("a|c");
    expect(status()).toHaveTextContent("Removed keyword “b”.");
    expect(box()).toHaveFocus();
  });

  it("marks the last tag on the first Backspace and removes it on the second", async () => {
    render(<Harness initial={["a", "b"]} />);
    await userEvent.type(box(), "{Backspace}");
    expect(tags()).toHaveTextContent("a|b");
    expect(status()).toHaveTextContent("Press Backspace again to remove “b”.");
    expect(screen.getByText("b").closest('[data-slot="tag"]')).toHaveAttribute(
      "data-armed",
      "true",
    );
    await userEvent.type(box(), "{Backspace}");
    expect(tags()).toHaveTextContent(/^a$/);
  });

  it("forgets the marked tag when typing goes on", async () => {
    render(<Harness initial={["a", "b"]} />);
    await userEvent.type(box(), "{Backspace}x{Backspace}{Backspace}");
    expect(tags()).toHaveTextContent("a|b");
  });

  it("keeps typed text as a tag when leaving the box", async () => {
    render(<Harness />);
    await userEvent.type(box(), "left");
    await userEvent.tab();
    expect(tags()).toHaveTextContent("left");
  });

  it("is described by the field's hint", () => {
    render(<Harness />);
    expect(box()).toHaveAccessibleDescription("Press Enter to add.");
  });
});
