import type { ComponentProps } from "react";

import type { FieldTone } from "../components/input";
import { cn } from "../lib/utils";
import { radioClass } from "./controlStyles";

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
  tone?: FieldTone;
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
  tone = "onWhite",
  className,
  ...inputProps
}: RadioChoicesProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {choices.map((choice) => {
        const id = `${idPrefix}-${choice.value}`;
        return (
          <div key={choice.value} className="flex items-start gap-3">
            <input
              {...inputProps}
              type="radio"
              id={id}
              name={name}
              value={choice.value}
              aria-describedby={
                choice.description ? `${id}-description` : undefined
              }
              className={radioClass(tone === "onBlue")}
            />
            <label
              htmlFor={id}
              className={cn(
                "text-[0.95em] peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                tone === "onBlue" ? "text-white" : "text-foreground",
              )}
            >
              <span className="font-medium">{choice.label}</span>
              {choice.description ? (
                <span
                  id={`${id}-description`}
                  className={cn(
                    "block text-[0.88em]",
                    tone === "onBlue"
                      ? "text-white/80"
                      : "text-muted-foreground",
                  )}
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
