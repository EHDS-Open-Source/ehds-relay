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

describe("SearchField icon", () => {
  it("draws the search icon after the input", () => {
    const { container } = render(<SearchField value="" onChange={vi.fn()} />);
    const input = container.querySelector("input")!;
    expect(
      input.compareDocumentPosition(
        container.querySelector("[data-icon='search']")!,
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it("shows the reminder date with screen-reader text and the card star colour", () => {
    render(
      <CardGrid>
        <DatasetCard
          title="Due"
          reminderDate="4 Mar 2027"
          starColour="#E3A6E4"
          renderLink={renderLink}
        />
      </CardGrid>,
    );
    const link = screen.getByRole("link", { name: /Due/ });
    expect(link).toHaveTextContent("Revalidation due 4 Mar 2027");
    expect(link.querySelector("[data-band='reminder']")).not.toBeNull();
    expect(screen.getByText("Revalidation due")).toHaveClass("sr-only");
    expect(link.querySelector("[data-icon='star']")).toHaveStyle({
      color: "#E3A6E4",
    });
  });

  it("says Overdue in the footer, read out as overdue since the date, with a blue star", () => {
    render(
      <DatasetCard
        title="Late"
        overdue
        reminderDate="1 January 2026"
        starColour="#E3A6E4"
        renderLink={renderLink}
      />,
    );
    const link = screen.getByRole("link");
    expect(screen.getByText("Overdue")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Revalidation overdue since")).toHaveClass(
      "sr-only",
    );
    expect(link).toHaveTextContent("1 January 2026");
    expect(link.querySelector("[data-band='overdue']")).not.toBeNull();
    expect(link.querySelector("[data-icon='calendarAlert']")).not.toBeNull();
    expect(link.querySelector("[data-band] [data-icon='star']")).toHaveStyle({
      color: "var(--blue)",
    });
  });

  it("has no footer band without a reminder or overdue", () => {
    render(<DatasetCard title="Plain" renderLink={renderLink} />);
    expect(screen.getByRole("link").querySelector("[data-band]")).toBeNull();
  });

  it("marks the title as a level 2 heading", () => {
    render(<DatasetCard title="Head" renderLink={renderLink} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Head" }),
    ).toBeVisible();
  });
});
