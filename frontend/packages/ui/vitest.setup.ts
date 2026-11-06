import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library can't register its own cleanup.
afterEach(cleanup);

// Radix Select (the Dropdown) needs these; jsdom does not implement them.
const elementPrototype = window.HTMLElement.prototype as unknown as Record<
  string,
  unknown
>;
const stubs: Record<string, () => unknown> = {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
};
for (const [name, stub] of Object.entries(stubs)) {
  if (!(name in elementPrototype)) elementPrototype[name] = stub;
}
