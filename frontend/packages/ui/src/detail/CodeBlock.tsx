import { useState } from "react";

import { Button } from "../components/button";
import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface CodeBlockProps {
  text: string;
  /** Accessible name of the code, e.g. "Turtle". */
  label: string;
  /** The format named in the panel's corner, e.g. "text/turtle". Defaults to `label`. */
  formatLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
  copyFailedLabel?: string;
  /** Extra controls next to Copy, e.g. a Download button. Use `CodeBlockButton` for them. */
  actions?: React.ReactNode;
  /** Square top-left corner, for a panel that sits right under a tab. */
  attached?: boolean;
  /** Classes for the scrolling code area, e.g. a lower height limit. */
  codeClassName?: string;
}

/** A small outline button for the dark code panel's header. */
export function CodeBlockButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      {...props}
      className={cn(
        "border-code-control bg-transparent text-white hover:border-white hover:bg-white/8",
        props.className,
      )}
    />
  );
}

/** Output text on a deep navy panel, with its format named and Copy beside it. */
export function CodeBlock({
  text,
  label,
  formatLabel = label,
  copyLabel = messages.copy,
  copiedLabel = messages.copied,
  copyFailedLabel = messages.copyFailed,
  actions,
  attached = false,
  codeClassName,
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
    <div
      data-slot="code-block"
      data-surface="blue"
      className={cn(
        "max-w-full min-w-0 overflow-hidden rounded-[18px] bg-code-bg text-code-text",
        attached && "rounded-tl-none",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-code-border px-4 py-2.5">
        <span
          aria-hidden
          data-slot="code-label"
          className="text-[11px] leading-[1.6] font-semibold text-code-label"
        >
          {formatLabel}
        </span>
        <span role="status" className="mr-auto text-sm text-code-text">
          {state === "copied"
            ? copiedLabel
            : state === "failed"
              ? copyFailedLabel
              : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          <CodeBlockButton onClick={() => void copy()}>
            {copyLabel}
          </CodeBlockButton>
          {actions}
        </div>
      </div>
      <pre
        tabIndex={0}
        aria-label={label}
        className={cn(
          "max-h-[600px] overflow-auto p-5 font-mono text-[13px] leading-[1.7] whitespace-pre focus-visible:outline-offset-[-3px]",
          codeClassName,
        )}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}
