import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CardGrid } from "./CardGrid";
import { DatasetCard } from "./DatasetCard";
import { FilterChips } from "./FilterChips";
import { SearchField } from "./SearchField";

describe("SearchField", () => {
  it("reports typing", async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("searchbox"), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });
});

describe("FilterChips", () => {
  const options = [
    { value: "all", label: "All" },
    { value: "public", label: "Public" },
  ] as const;

  it("marks exactly one chip pressed and reports clicks", async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        options={options}
        value="all"
        onChange={onChange}
        label="Access"
      />,
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Public" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await userEvent.click(screen.getByRole("button", { name: "Public" }));
    expect(onChange).toHaveBeenCalledWith("public");
  });
});

describe("DatasetCard", () => {
  const renderLink = ({
    className,
    children,
  }: {
    className: string;
    children: React.ReactNode;
  }) => (
    <a href="/x" className={className}>
      {children}
    </a>
  );

  it("shows the Draft chip only for drafts", () => {
    render(
      <CardGrid>
        <DatasetCard
          title="One"
          description="d"
          draft
          renderLink={renderLink}
        />
        <DatasetCard title="Two" renderLink={renderLink} />
      </CardGrid>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("Draft")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /One/ })).toHaveAttribute(
      "href",
      "/x",
    );
  });

  it("EDIT-14 shows the Overdue chip only for overdue datasets", () => {
    render(
      <CardGrid>
        <DatasetCard title="Old" overdue renderLink={renderLink} />
        <DatasetCard title="Draft one" draft overdue renderLink={renderLink} />
        <DatasetCard title="Fresh" renderLink={renderLink} />
      </CardGrid>,
    );
    expect(screen.getAllByText("Overdue")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Old/ })).toHaveTextContent(
      "Overdue",
    );
    expect(screen.getByRole("link", { name: /Fresh/ })).not.toHaveTextContent(
      "Overdue",
    );
  });
});
