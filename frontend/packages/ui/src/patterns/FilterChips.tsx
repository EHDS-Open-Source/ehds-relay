import { cn } from "../lib/utils";

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterChipsProps<T extends string> {
  options: readonly FilterChipOption<T>[];
  /** The one selected value. */
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
}

/** A row of outline pills where exactly one is selected; the active one is filled blue. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-3">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-full border-2 px-5 text-[0.95em] font-semibold transition-[color,background-color,border-color]",
              selected
                ? "border-blue bg-blue text-white"
                : "border-blue-tint-80 bg-transparent text-blue hover:border-blue hover:bg-blue-tint-90",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
