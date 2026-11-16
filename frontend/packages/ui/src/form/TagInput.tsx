import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { Icon } from "../icons";
import { cn } from "../lib/utils";
import { messages } from "../messages";
import { useFieldDescribedBy } from "./Field";

/** How long a line under the field stays before it clears. */
const STATUS_MS = 4000;

export interface TagNoun {
  /** One tag, e.g. "keyword". */
  one: string;
  /** Several tags, e.g. "keywords". */
  many: string;
}

export interface TagInputProps {
  id: string;
  value: readonly string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  /** What a tag is, for the placeholder, the remove buttons and the status line. */
  noun?: TagNoun;
  /** Placeholder while there are no tags; afterwards it reads "Add another <noun>". */
  placeholder?: string;
  /** Most characters in one tag. Typing stops there and longer pasted items are shortened. */
  maxLength?: number;
  /** Most tags. At the limit the box stays usable but refuses further tags. */
  maxTags?: number;
  invalid?: boolean;
  "aria-describedby"?: string;
}

type Status = { text: string; problem: boolean } | null;

/** The non-empty items in `raw`, split on commas and trimmed. */
function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** `tag` cut to at most `max` UTF-16 units without splitting a character, then trimmed. */
function shorten(tag: string, max: number): string {
  let out = "";
  for (const char of tag) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out.trim();
}

/**
 * A list of short texts in one box. Enter or a comma adds what is typed, pasting a
 * comma-separated list adds each item, and leaving the box adds anything still typed.
 * Repeats are refused whatever their capitals. With `maxLength` and `maxTags` the box refuses
 * what is too long or too many and says so; problems are announced before good news. Each tag has a remove button; Backspace in
 * the empty box first marks the last tag, and a second press removes it. A status line under
 * the box says what happened and is read out by screen readers.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  noun = messages.tagInput.noun,
  placeholder = messages.tagInput.placeholder,
  maxLength,
  maxTags,
  invalid,
  "aria-describedby": describedBy,
}: TagInputProps) {
  const text = messages.tagInput;
  const [draft, setDraft] = useState("");
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const lastText = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ariaDescribedBy = useFieldDescribedBy(describedBy);
  const statusId = `${id}-status`;

  useEffect(() => () => clearTimeout(timer.current), []);

  function announce(message: string, problem = false, reread = true) {
    clearTimeout(timer.current);
    const show = () => {
      lastText.current = message;
      setStatus({ text: message, problem });
      timer.current = setTimeout(() => {
        lastText.current = "";
        setStatus(null);
      }, STATUS_MS);
    };
    if (reread && message === lastText.current) {
      // A live region ignores text that has not changed, so clear it first
      setStatus(null);
      timer.current = setTimeout(show, 50);
    } else {
      show();
    }
  }

  /** Adds the items in `raw`; says how many were added and whether the limit stopped any. */
  function add(raw: string): { added: number; limit: boolean } {
    const next = [...value];
    const added: string[] = [];
    let repeat: string | undefined;
    let limit = false;
    let shortened = false;
    for (const item of splitTags(raw)) {
      let tag = item;
      if (maxLength !== undefined && tag.length > maxLength) {
        tag = shorten(tag, maxLength);
        shortened = true;
        if (!tag) continue;
      }
      const lower = tag.toLowerCase();
      if (next.some((t) => t.toLowerCase() === lower)) {
        repeat = tag;
        continue;
      }
      if (maxTags !== undefined && next.length >= maxTags) {
        limit = true;
        continue;
      }
      next.push(tag);
      added.push(tag);
    }
    if (added.length) onChange(next);
    setArmed(false);
    if (limit && maxTags !== undefined)
      announce(text.upTo(maxTags, noun.many), true);
    else if (repeat !== undefined) announce(text.alreadyAdded(repeat), true);
    else if (shortened && maxLength !== undefined)
      announce(text.tooLong(noun.many, maxLength), true);
    else if (added.length === 1) announce(text.added(noun.one, added[0]!));
    else if (added.length > 1)
      announce(text.addedMany(added.length, noun.many));
    return { added: added.length, limit };
  }

  function remove(index: number) {
    const gone = value[index];
    if (gone === undefined) return;
    onChange(value.filter((_, i) => i !== index));
    setArmed(false);
    announce(text.removed(noun.one, gone));
  }

  function commit() {
    if (!draft.trim()) {
      setDraft("");
      return;
    }
    const { added, limit } = add(draft);
    // Text the limit refused stays in the box
    if (!(limit && added === 0)) setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter adds a tag; it must not submit the surrounding form
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length) {
      event.preventDefault();
      if (armed) {
        remove(value.length - 1);
      } else {
        setArmed(true);
        announce(text.pressAgain(value[value.length - 1]!), true);
      }
      return;
    }
    if (armed) setArmed(false);
    const input = event.currentTarget;
    if (
      maxLength !== undefined &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      draft.length >= maxLength &&
      input.selectionStart === input.selectionEnd
    ) {
      // The browser drops the character; say why
      announce(text.tooLong(noun.many, maxLength), true, false);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.includes(",")) {
      const input = event.currentTarget;
      const room =
        (maxLength ?? Infinity) -
        draft.length +
        ((input.selectionEnd ?? 0) - (input.selectionStart ?? 0));
      // The browser cuts what does not fit; say so
      if (maxLength !== undefined && pasted.length > room) {
        announce(text.tooLong(noun.many, maxLength), true);
      }
      return;
    }
    event.preventDefault();
    const { added, limit } = add(`${draft},${pasted}`);
    if (!(limit && added === 0)) setDraft("");
  }

  return (
    <>
      {/* One box holds the tags and the typing area; clicking anywhere in it focuses the input. */}
      <div
        data-slot="tag-input"
        aria-invalid={invalid || undefined}
        className={cn(
          "flex min-h-[52px] cursor-text flex-wrap items-center gap-2 rounded-field border-2 border-input bg-white px-3 py-2 transition-colors",
          "focus-within:border-blue has-[>input:focus-visible]:[outline:3px_solid_var(--blue)] has-[>input:focus-visible]:[outline-offset:3px]",
          "aria-invalid:border-destructive aria-invalid:focus-within:border-destructive",
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            document.getElementById(id)?.focus();
        }}
      >
        {value.map((tag, index) => {
          const isArmed = armed && index === value.length - 1;
          return (
            <span
              key={`${index}:${tag}`}
              data-slot="tag"
              data-armed={isArmed || undefined}
              className={cn(
                "inline-flex h-8 max-w-full items-center gap-1 rounded-full border-2 pr-1 pl-3 text-[0.88em] font-semibold whitespace-nowrap",
                isArmed
                  ? "border-destructive bg-error-bg text-destructive"
                  : "border-transparent bg-blue-tint-90 text-blue",
              )}
            >
              {tag}
              <button
                type="button"
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full focus-visible:outline-offset-1",
                  isArmed
                    ? "hover:bg-destructive/12"
                    : "hover:bg-blue/12 hover:text-blue",
                )}
                aria-label={text.remove(noun.one, tag)}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(index);
                  document.getElementById(id)?.focus();
                }}
              >
                <Icon name="close" style={{ width: 10, height: 10 }} />
              </button>
            </span>
          );
        })}
        <input
          id={id}
          value={draft}
          placeholder={
            maxTags !== undefined && value.length >= maxTags
              ? text.maxReached(maxTags, noun.many)
              : value.length
                ? text.addAnother(noun.one)
                : placeholder
          }
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          className="h-8 min-w-40 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            setDraft(event.target.value);
            if (armed) setArmed(false);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            commit();
            onBlur?.();
          }}
        />
      </div>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={cn(
          "-mt-1 text-[0.88em] font-medium empty:sr-only",
          status?.problem ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {status?.text}
      </p>
    </>
  );
}
