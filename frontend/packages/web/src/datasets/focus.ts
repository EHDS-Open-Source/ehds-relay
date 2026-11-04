import { scrollBehavior } from "@ehds-relay/ui";

import { fieldAnchorId } from "./fields";

/** Scrolls to the element with this id and moves focus to its first input. */
export function focusAnchor(id: string): void {
  const anchor = document.getElementById(id);
  if (!anchor) return;
  const input = anchor.querySelector<HTMLElement>("input, textarea, select");
  anchor.scrollIntoView?.({ behavior: scrollBehavior(), block: "center" });
  (input ?? anchor).focus({ preventScroll: true });
}

/** Scrolls to a field of the form and moves focus to its first input. */
export function focusField(key: string): void {
  focusAnchor(fieldAnchorId(key));
}
