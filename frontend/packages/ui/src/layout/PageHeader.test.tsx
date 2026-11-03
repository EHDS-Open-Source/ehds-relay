import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the eyebrow, title, description and actions", () => {
    render(
      <PageHeader
        eyebrow="Acme"
        title="Catalogue"
        description="All datasets"
        actions={<button>Add</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Catalogue" }),
    ).toBeVisible();
    expect(screen.getByText("Acme")).toBeVisible();
    expect(screen.getByText("All datasets")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add" })).toBeVisible();
  });
});

describe("EmptyState", () => {
  it("renders the title, description and action", () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Come back later"
        action={<button>Go</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeVisible();
    expect(screen.getByText("Come back later")).toBeVisible();
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });
});
