import { useState, type KeyboardEvent } from "react";

import { Icon } from "../icons";
import { messages } from "../messages";

export interface TagInputProps {
  id: string;
  value: readonly string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Prefix of each tag's remove button name, e.g. "Remove" gives "Remove oncology". */
  removeLabel?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
}

/**
 * A list of short texts entered one at a time: Enter (or leaving the box) adds the typed text
 * as a tag, each tag has a remove button, and Backspace in the empty box removes the last one.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  removeLabel = messages.tagInput.remove,
  invalid,
  "aria-describedby": describedBy,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Enter adds a tag; it must not submit the surrounding form
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    // One box holds the tags and the typing area; clicking anywhere in it focuses the input.
    <div
      data-slot="tag-input"
      aria-invalid={invalid || undefined}
      className="flex min-h-[52px] cursor-text flex-wrap items-center gap-2 rounded-xl border-2 border-input bg-white p-2 transition-colors duration-150 focus-within:border-blue aria-invalid:border-destructive"
      onClick={(event) => {
        if (event.target === event.currentTarget)
          document.getElementById(id)?.focus();
      }}
    >
      {value.map((tag, index) => (
        <span
          key={tag}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-blue-tint-90 pr-1 pl-3 text-[0.9em] font-semibold text-blue"
        >
          {tag}
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-full hover:bg-blue-tint-80"
            aria-label={`${removeLabel} ${tag}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Icon name="close" size="xs" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="min-w-[8rem] flex-1 bg-transparent px-2 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit();
          onBlur?.();
        }}
      />
    </div>
  );
}
