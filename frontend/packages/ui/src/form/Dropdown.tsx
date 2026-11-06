import { Select } from "radix-ui";

import { onBlueFieldClass, type FieldTone } from "../components/input";
import { Icon } from "../icons";
import { cn } from "../lib/utils";
import { useFieldDescribedBy } from "./Field";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  id?: string;
  /** The chosen value; an empty string means nothing is chosen and the placeholder shows. */
  value: string;
  onValueChange: (value: string) => void;
  options: readonly DropdownOption[];
  /** Shown while nothing is chosen. It is never listed as an option. */
  placeholder?: string;
  /** `onBlue` is the underline field for blue surfaces. */
  tone?: FieldTone;
  /** `compact` is a 34px trigger for use inside a row. */
  size?: "default" | "compact";
  disabled?: boolean;
  required?: boolean;
  /** Name of the hidden native select, so the value is part of a submitted form. */
  name?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

/**
 * A custom select: a trigger that looks like `Input`, and a white card listing the options
 * with the keyboard behaviour of a listbox (arrows, Home/End, type-ahead, Enter, Esc). A
 * hidden native select keeps it working in forms.
 */
export function Dropdown({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  tone = "onWhite",
  size = "default",
  disabled,
  required,
  name,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": describedBy,
  className,
}: DropdownProps) {
  const ariaDescribedBy = useFieldDescribedBy(describedBy);
  const onBlue = tone === "onBlue";
  return (
    <Select.Root
      // An empty string shows the placeholder.
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
      name={name}
    >
      <Select.Trigger
        id={id}
        data-slot="dropdown"
        data-tone={tone}
        data-size={size}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "relative flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 text-left transition-[color,border-color] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          onBlue
            ? `${onBlueFieldClass} pr-8 data-[placeholder]:font-medium data-[placeholder]:text-white/75`
            : "h-[51px] rounded-field border-2 border-input bg-white py-3 pr-12 pl-4 text-base text-foreground data-[placeholder]:text-muted-foreground focus-visible:border-blue aria-invalid:border-destructive focus-visible:aria-invalid:border-destructive",
          size === "compact" &&
            "h-[34px] py-0 pr-10 pl-4 text-[0.9em] font-semibold",
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2",
            onBlue ? "right-1 text-yellow" : "right-4 text-blue",
          )}
        >
          <Icon name="chevronDown" style={{ width: 14, height: 14 }} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="bottom"
          sideOffset={8}
          collisionPadding={8}
          data-slot="dropdown-content"
          className="z-50 max-h-[min(300px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-[12px] bg-white p-2 text-foreground shadow-overlay"
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center justify-between gap-2 rounded-[8px] px-4 py-3 text-base outline-none select-none data-[highlighted]:bg-blue-tint-95 data-[highlighted]:text-blue data-[state=checked]:font-bold data-[state=checked]:text-blue"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Icon name="tick" size="sm" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
