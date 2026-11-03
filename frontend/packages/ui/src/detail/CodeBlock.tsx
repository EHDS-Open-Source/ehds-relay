import { useState } from "react";

import { Button } from "../components/button";
import { messages } from "../messages";

export interface CodeBlockProps {
  text: string;
  /** Accessible name of the block, e.g. "Turtle". */
  label: string;
  copyLabel?: string;
  copiedLabel?: string;
  copyFailedLabel?: string;
  /** Extra controls next to Copy, e.g. a Download button. */
  actions?: React.ReactNode;
}

/** Preformatted text with a Copy button. */
export function CodeBlock({
  text,
  label,
  copyLabel = messages.copy,
  copiedLabel = messages.copied,
  copyFailedLabel = messages.copyFailed,
  actions,
}: CodeBlockProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b p-2">
        <span
          role="status"
          className="mr-auto px-2 text-sm text-muted-foreground"
        >
          {state === "copied"
            ? copiedLabel
            : state === "failed"
              ? copyFailedLabel
              : ""}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy()}
        >
          {copyLabel}
        </Button>
        {actions}
      </div>
      <pre
        tabIndex={0}
        aria-label={label}
        className="max-h-[32rem] overflow-auto p-4 font-mono text-xs leading-relaxed"
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}
