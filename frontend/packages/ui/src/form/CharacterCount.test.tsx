import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharacterCount, characterCountState } from "./CharacterCount";

describe("characterCountState", () => {
  it("is near from 90% of the limit up to it, and over after", () => {
    expect(characterCountState(179, 200)).toBe("ok");
    expect(characterCountState(180, 200)).toBe("near");
    expect(characterCountState(200, 200)).toBe("near");
    expect(characterCountState(201, 200)).toBe("over");
  });
});

describe("CharacterCount", () => {
  const counter = () => document.querySelector("[data-slot=character-count]");

  it("shows the count with en-GB separators while active and not empty", () => {
    render(<CharacterCount length={1234} max={2000} active />);
    expect(counter()).toHaveTextContent("1,234 / 2,000");
    expect(counter()).toHaveAttribute("aria-hidden", "true");
  });

  it("is hidden when not active, empty or told to hide, unless near or over", () => {
    const { rerender } = render(<CharacterCount length={10} max={200} />);
    expect(counter()).toBeNull();
    rerender(<CharacterCount length={0} max={200} active />);
    expect(counter()).toBeNull();
    rerender(<CharacterCount length={190} max={200} />);
    expect(counter()).toHaveTextContent("190 / 200");
    expect(counter()).toHaveClass("is-near");
    rerender(<CharacterCount length={215} max={200} />);
    expect(counter()).toHaveTextContent("15 over the 200 character limit");
    expect(counter()).toHaveClass("is-over");
    rerender(<CharacterCount length={215} max={200} hidden />);
    expect(counter()).toBeNull();
  });

  it("announces only when the state changes", () => {
    const { rerender } = render(<CharacterCount length={100} max={200} />);
    const live = screen.getByRole("status");
    expect(live).toHaveTextContent("");
    rerender(<CharacterCount length={185} max={200} />);
    expect(live).toHaveTextContent("15 characters left.");
    rerender(<CharacterCount length={190} max={200} />);
    expect(live).toHaveTextContent("15 characters left.");
    rerender(<CharacterCount length={201} max={200} />);
    expect(live).toHaveTextContent("Over the 200 character limit.");
    rerender(<CharacterCount length={150} max={200} />);
    expect(live).toHaveTextContent("");
  });
});
