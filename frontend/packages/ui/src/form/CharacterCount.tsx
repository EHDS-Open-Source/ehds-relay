import { useState } from "react";

import { cn } from "../lib/utils";
import { messages } from "../messages";

export type CharacterCountState = "ok" | "near" | "over";

/** Which band a text of `length` characters is in: over the limit, in its last 10%, or fine. */
export function characterCountState(
  length: number,
  max: number,
): CharacterCountState {
  if (length > max) return "over";
  return length >= 0.9 * max ? "near" : "ok";
}

export interface CharacterCountProps {
  length: number;
  max: number;
  /** The field has focus: the count shows once there is text, not only near the limit. */
  active?: boolean;
  /** Hide the count, e.g. while the field shows its own error. */
  hidden?: boolean;
}

/**
 * "120 / 200" under a text field. Shown while the field is focused and not empty, and
 * always in the last 10% of the limit and over it. Never blocks typing. The visible line is
 * hidden from screen readers; a polite live region speaks only when the state changes.
 */
export function CharacterCount({
  length,
  max,
  active = false,
  hidden = false,
}: CharacterCountProps) {
  const state = characterCountState(length, max);
  const text = messages.characterCount;
  const spoken =
    state === "near"
      ? text.left(max - length)
      : state === "over"
        ? text.overLimit(max)
        : "";
  // The spoken text keeps its first value for as long as the state stays the same
  const [announced, setAnnounced] = useState({ state, spoken });
  if (announced.state !== state) setAnnounced({ state, spoken });

  const visible = !hidden && ((active && length > 0) || state !== "ok");
  return (
    <>
      {visible ? (
        <p
          aria-hidden="true"
          data-slot="character-count"
          className={cn(
            "char-count text-right text-[0.85em] font-medium tabular-nums text-ink-3",
            state === "near" && "is-near font-semibold text-warning-on-white",
            state === "over" && "is-over font-semibold text-error-on-white",
          )}
        >
          {state === "over"
            ? text.over(length - max, max)
            : text.count(length, max)}
        </p>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {hidden ? "" : announced.spoken}
      </span>
    </>
  );
}
