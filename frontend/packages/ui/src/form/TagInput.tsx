import { useState, type KeyboardEvent } from "react";

import { Input } from "../components/input";
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
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pr-1 pl-3 text-sm text-accent-foreground"
            >
              {tag}
              <button
                type="button"
                className="rounded-full px-1.5 leading-none hover:bg-background/60"
                aria-label={`${removeLabel} ${tag}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
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
