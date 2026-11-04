import type { Ref } from "react";

import { Icon } from "../icons";
import { messages } from "../messages";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name; also the placeholder unless one is given. */
  label?: string;
  placeholder?: string;
  /** Lets the page move focus here, e.g. after clearing a search. */
  ref?: Ref<HTMLInputElement>;
}

/** A rounded search field, 40px tall, with the search icon on the right. */
export function SearchField({
  value,
  onChange,
  label = messages.search.label,
  placeholder,
  ref,
}: SearchFieldProps) {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-full border-2 border-blue-tint-80 bg-white pr-12 pl-5 text-ink transition-[border-color] outline-none placeholder:text-ink-3 hover:border-blue focus:border-blue [&::-webkit-search-cancel-button]:appearance-none"
      />
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-blue"
      />
    </div>
  );
}
