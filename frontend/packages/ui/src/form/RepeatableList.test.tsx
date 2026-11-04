import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RepeatableList } from "./RepeatableList";

let next = 0;
function Harness({ minItems = 0 }) {
  const [rows, setRows] = useState([{ id: "r0" }]);
  return (
    <RepeatableList
      items={rows}
      minItems={minItems}
      addLabel="Add row"
      onAdd={() => setRows([...rows, { id: `n${++next}` }])}
      onRemove={(i) => setRows(rows.filter((_, j) => j !== i))}
      renderItem={(_row, i) => <span>Row {i + 1}</span>}
    />
  );
}

describe("RepeatableList", () => {
  it("adds and removes rows", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Remove 1" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Remove 1" }));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("removes with a cross icon, not a person glyph", () => {
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Remove 1" });
    expect(button.querySelector('[data-icon="close"]')).not.toBeNull();
  });

  it("keeps the minimum number of rows", () => {
    render(<Harness minItems={1} />);
    expect(
      screen.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
  });
});
