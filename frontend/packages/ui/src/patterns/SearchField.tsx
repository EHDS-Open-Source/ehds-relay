import { messages } from "../messages";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name; also the placeholder unless one is given. */
  label?: string;
  placeholder?: string;
}

export function SearchField({
  value,
  onChange,
  label = messages.search.label,
  placeholder,
}: SearchFieldProps) {
  return (
    <input
      type="search"
      value={value}
      aria-label={label}
      placeholder={placeholder ?? label}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-full border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    />
  );
}
