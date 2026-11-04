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
  className?: string;
}

const chipClass = (selected: boolean) =>
  cn(
    "h-10 rounded-full border-2 px-5 text-[0.95em] font-semibold transition-[color,background-color,border-color]",
    selected
      ? "border-blue bg-blue text-white"
      : "border-line bg-white text-ink hover:border-blue hover:text-blue",
  );

export interface FilterToggleProps {
  label: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}

/** A single chip that switches a filter on and off, styled like the chips in a group. */
export function FilterToggle({ label, pressed, onChange }: FilterToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={chipClass(pressed)}
    >
      {label}
    </button>
  );
}

/** A row of outline pills where exactly one is selected; the active one is filled blue. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-3", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={chipClass(selected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
