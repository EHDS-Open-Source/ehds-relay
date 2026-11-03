import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { messages } from "./messages";

afterEach(() => vi.unstubAllGlobals());

describe("App", () => {
  it("renders the shared Button and the API status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ status: "ok" }))),
    );

    render(<App />);

    expect(
      screen.getByRole("button", { name: messages.getStarted }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(messages.healthStatus("ok")),
    ).toBeInTheDocument();
  });
});
