import type { Ref } from "react";

import { Icon } from "../icons";
import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name; also the placeholder unless one is given. */
  label?: string;
  placeholder?: string;
  /** Lets the page move focus here, e.g. after clearing a search. */
  ref?: Ref<HTMLInputElement>;
  /** Classes for the wrapper, e.g. a maximum width inside a toolbar. */
  className?: string;
}

/** A rounded search field, 40px tall, with the search icon on the right. */
export function SearchField({
  value,
  onChange,
  label = messages.search.label,
  placeholder,
  ref,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <input
        ref={ref}
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border-2 border-line bg-white pr-12 pl-5 text-[0.95em] text-ink transition-[border-color] placeholder:text-ink-3 hover:border-blue focus:border-blue [&::-webkit-search-cancel-button]:appearance-none"
      />
      <Icon
        name="search"
        size="lg"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-blue"
      />
    </div>
  );
}
