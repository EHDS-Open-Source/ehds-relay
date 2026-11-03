import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TagInput } from "./TagInput";

function Harness({ initial = [] as string[], onSubmit = vi.fn() }) {
  const [tags, setTags] = useState(initial);
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="kw">Keywords</label>
      <TagInput id="kw" value={tags} onChange={setTags} />
      <output>{tags.join("|")}</output>
    </form>
  );
}

describe("TagInput", () => {
  it("adds a tag on Enter without submitting the form", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const box = screen.getByLabelText("Keywords");
    await userEvent.type(box, " oncology {Enter}cancer{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("oncology|cancer");
    expect(box).toHaveValue("");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores empty and duplicate tags", async () => {
    render(<Harness initial={["a"]} />);
    await userEvent.type(
      screen.getByLabelText("Keywords"),
      "a{Enter}  {Enter}",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^a$/);
  });

  it("removes a tag with its button and with Backspace", async () => {
    render(<Harness initial={["a", "b", "c"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove b" }));
    expect(screen.getByRole("status")).toHaveTextContent("a|c");
    await userEvent.type(screen.getByLabelText("Keywords"), "{Backspace}");
    expect(screen.getByRole("status")).toHaveTextContent(/^a$/);
  });

  it("keeps typed text as a tag when leaving the box", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("Keywords"), "left");
    await userEvent.tab();
    expect(screen.getByRole("status")).toHaveTextContent("left");
  });
});
