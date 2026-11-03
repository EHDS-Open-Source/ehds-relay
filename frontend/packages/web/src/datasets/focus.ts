import { fieldAnchorId } from "./fields";

/** Scrolls to a field of the form and moves focus to its first input. */
export function focusField(key: string): void {
  const anchor = document.getElementById(fieldAnchorId(key));
  if (!anchor) return;
  const input = anchor.querySelector<HTMLElement>("input, textarea, select");
  anchor.scrollIntoView?.({ behavior: "smooth", block: "center" });
  (input ?? anchor).focus({ preventScroll: true });
}
