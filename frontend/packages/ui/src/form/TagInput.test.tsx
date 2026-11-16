import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";
import { TagInput } from "./TagInput";

const noun = { one: "keyword", many: "keywords" };

function Harness({
  initial = [] as string[],
  onSubmit = vi.fn(),
  limits = {} as { maxLength?: number; maxTags?: number },
}) {
  const [tags, setTags] = useState(initial);
  return (
    <form onSubmit={onSubmit}>
      <Field label="Keywords" htmlFor="kw" hint="Press Enter to add.">
        <TagInput
          id="kw"
          value={tags}
          onChange={setTags}
          noun={noun}
          {...limits}
        />
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

  describe("limits", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `k${i}`);
    const paste = (data: string) =>
      fireEvent.paste(box(), { clipboardData: { getData: () => data } });

    it("stops typing at the longest tag and says so", async () => {
      render(<Harness limits={{ maxLength: 5 }} />);
      await userEvent.type(box(), "abcdefg");
      expect(box()).toHaveValue("abcde");
      expect(status()).toHaveTextContent("Keywords can be up to 5 characters.");
    });

    it("shortens a pasted item and says so", () => {
      render(<Harness limits={{ maxLength: 5 }} />);
      paste("abcdefgh, ok");
      expect(tags()).toHaveTextContent("abcde|ok");
      expect(status()).toHaveTextContent("Keywords can be up to 5 characters.");
    });

    it("says so when a paste without commas does not fit", () => {
      render(<Harness limits={{ maxLength: 5 }} />);
      paste("abcdefgh");
      expect(status()).toHaveTextContent("Keywords can be up to 5 characters.");
    });

    it("does not split a character when shortening", () => {
      render(<Harness limits={{ maxLength: 3 }} />);
      paste("ab😀x, y");
      expect(tags()).toHaveTextContent("ab|y");
    });

    it("refuses a tag past the maximum, keeping the text and focus", async () => {
      render(<Harness initial={twenty} limits={{ maxTags: 20 }} />);
      expect(box()).toHaveAttribute(
        "placeholder",
        "Maximum of 20 keywords reached",
      );
      await userEvent.type(box(), "extra{Enter}");
      expect(tags().textContent?.split("|")).toHaveLength(20);
      expect(box()).toHaveValue("extra");
      expect(box()).toHaveFocus();
      expect(status()).toHaveTextContent("You can add up to 20 keywords.");
      await userEvent.type(box(), ",");
      expect(box()).toHaveValue("extra");
      await userEvent.tab();
      expect(box()).toHaveValue("extra");
      expect(
        await screen.findByText("You can add up to 20 keywords."),
      ).toBeInTheDocument();
    });

    it("still removes the last tag with Backspace at the maximum", async () => {
      render(<Harness initial={twenty} limits={{ maxTags: 20 }} />);
      await userEvent.type(box(), "{Backspace}{Backspace}");
      expect(tags().textContent?.split("|")).toHaveLength(19);
      expect(box()).toHaveAttribute("placeholder", "Add another keyword");
    });

    it("adds a paste up to the maximum, then shows the limit message", () => {
      render(
        <Harness initial={twenty.slice(0, 18)} limits={{ maxTags: 20 }} />,
      );
      paste("a, b, c, d");
      expect(tags().textContent?.split("|")).toHaveLength(20);
      expect(tags()).toHaveTextContent("k17|a|b");
      expect(tags()).not.toHaveTextContent("c");
      expect(status()).toHaveTextContent("You can add up to 20 keywords.");
      expect(status()).not.toHaveTextContent("Added");
    });

    it("still refuses repeats whatever their capitals", async () => {
      render(
        <Harness initial={["EHDS"]} limits={{ maxLength: 50, maxTags: 20 }} />,
      );
      await userEvent.type(box(), "ehds{Enter}");
      expect(tags()).toHaveTextContent(/^EHDS$/);
      expect(status()).toHaveTextContent("“ehds” is already added.");
    });

    it("says the limit before a repeat when both apply", () => {
      render(<Harness initial={["a", "b"]} limits={{ maxTags: 2 }} />);
      paste("A, c");
      expect(status()).toHaveTextContent("You can add up to 2 keywords.");
    });

    it("announces the same message again after clearing it", async () => {
      render(<Harness initial={["a", "b"]} limits={{ maxTags: 2 }} />);
      await userEvent.type(box(), "x{Enter}");
      expect(status()).toHaveTextContent("You can add up to 2 keywords.");
      await userEvent.type(box(), "{Enter}");
      expect(status()).toBeEmptyDOMElement();
      expect(await screen.findByText("You can add up to 2 keywords.")).toBe(
        status(),
      );
    });

    it("has no limits unless given", async () => {
      render(<Harness initial={twenty} />);
      await userEvent.type(box(), `${"x".repeat(80)}{Enter}`);
      expect(tags().textContent?.split("|")).toHaveLength(21);
    });
  });
});
