import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

export interface RadioChoice {
  value: string;
  label: string;
  /** One line under the label explaining the choice. */
  description?: string;
}

export interface RadioChoicesProps extends Omit<
  ComponentProps<"input">,
  "type" | "value" | "id"
> {
  /** Prefix for each radio button's id: `${idPrefix}-${value}`. */
  idPrefix: string;
  name: string;
  choices: readonly RadioChoice[];
  className?: string;
}

/**
 * Native radio buttons, one per choice. Extra props (e.g. a form library's `register`
 * result) are spread onto every input, so it works with uncontrolled forms.
 */
export function RadioChoices({
  idPrefix,
  name,
  choices,
  className,
  ...inputProps
}: RadioChoicesProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {choices.map((choice) => {
        const id = `${idPrefix}-${choice.value}`;
        return (
          <div key={choice.value} className="flex items-start gap-2">
            <input
              {...inputProps}
              type="radio"
              id={id}
              name={name}
              value={choice.value}
              aria-describedby={
                choice.description ? `${id}-description` : undefined
              }
              className="mt-0.5 size-4 accent-primary"
            />
            <label htmlFor={id} className="text-sm">
              <span className="font-medium">{choice.label}</span>
              {choice.description ? (
                <span
                  id={`${id}-description`}
                  className="block text-muted-foreground"
                >
                  {choice.description}
                </span>
              ) : null}
            </label>
          </div>
        );
      })}
    </div>
  );
}
