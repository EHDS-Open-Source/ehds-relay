import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createRelayApp } from "./createRelayApp";

describe("createRelayApp", () => {
  it("mounts the app and lands on the org picker for the stub session", async () => {
    const RelayApp = createRelayApp({ plugins: [] });
    render(<RelayApp />);
    expect(
      await screen.findByRole("heading", { name: "Select your organisation" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Demo org" })).toBeVisible();
  });
});
