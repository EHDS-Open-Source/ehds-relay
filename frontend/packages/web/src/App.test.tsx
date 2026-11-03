import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { messages } from "./messages";

describe("App", () => {
  it("renders the shared Button", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: messages.getStarted }),
    ).toBeInTheDocument();
  });
});
