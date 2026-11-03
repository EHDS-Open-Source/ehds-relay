import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library can't register its own cleanup.
afterEach(cleanup);

// The router scrolls to the top on navigation; jsdom does not implement it.
window.scrollTo = () => {};
