import { Popover } from "radix-ui";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";

import { Icon } from "../icons";
import {
  addDays,
  addMonths,
  addYears,
  clampIso,
  endOfWeek,
  formatLongDate,
  formatMonthYear,
  isWithin,
  monthGrid,
  sameMonth,
  startOfMonth,
  startOfWeek,
  todayIso,
  weekdayNames,
} from "../lib/isoDate";
import { cn } from "../lib/utils";
import { messages } from "../messages";
import { fieldLabelId, useFieldDescribedBy } from "./Field";

type Labels = { [K in keyof typeof messages.datePicker]: string };

export interface DatePickerProps {
  /** Id of the trigger button; the field's label points at it with `htmlFor`. */
  id: string;
  /** `YYYY-MM-DD`, or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Earliest and latest date that can be chosen, `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  /** Name of the hidden input that holds the value, for plain form posts. */
  name?: string;
  /** Show a "Clear date" button while a date is set. */
  clearable?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
  /** Text on the trigger while no date is set. */
  placeholder?: string;
  labels?: Partial<Labels>;
  /** Reaches the trigger button, so a form can focus it. */
  ref?: Ref<HTMLButtonElement>;
}

/** Where focus starts: the chosen day, else today if allowed, else the nearest allowed day. */
function startingDay(value: string, min?: string, max?: string): string {
  if (value) return value;
  return clampIso(todayIso(), min, max);
}

/**
 * A date field with its own Monday-first calendar. The trigger shows the date in words; the
 * value is kept in a hidden input as `YYYY-MM-DD`. There is no typed entry: the calendar can
 * be reached entirely from the keyboard.
 */
export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  name,
  clearable = false,
  invalid = false,
  disabled = false,
  "aria-describedby": describedBy,
  placeholder,
  labels: labelOverrides,
  ref,
}: DatePickerProps) {
  const labels: Labels = { ...messages.datePicker, ...labelOverrides };
  const shownPlaceholder = placeholder ?? labels.placeholder;
  const ariaDescribedBy = useFieldDescribedBy(describedBy);
  const valueId = useId();
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(() => startingDay(value, min, max));
  // Set by key presses so focus follows the day; clicks on the month buttons leave it be.
  const followFocus = useRef(false);
  const gridRef = useRef<HTMLTableElement>(null);

  const today = todayIso();
  const todayAllowed = isWithin(today, min, max);
  const weeks = useMemo(() => monthGrid(focused), [focused]);
  const weekdays = useMemo(() => weekdayNames(), []);
  const monthStart = startOfMonth(focused);
  const prevDisabled = Boolean(min && monthStart <= min);
  const nextDisabled = Boolean(max && addMonths(monthStart, 1) > max);

  useEffect(() => {
    if (!open || !followFocus.current) return;
    followFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-iso="${focused}"]`)
      ?.focus();
  }, [open, focused]);

  function changeOpen(next: boolean) {
    if (next) setFocused(startingDay(value, min, max));
    setOpen(next);
  }

  function choose(iso: string) {
    if (!isWithin(iso, min, max)) return;
    onChange(iso);
    setOpen(false);
  }

  function move(next: string) {
    followFocus.current = true;
    setFocused(next);
  }

  function onGridKeyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = (() => {
      switch (event.key) {
        case "ArrowLeft":
          return addDays(focused, -1);
        case "ArrowRight":
          return addDays(focused, 1);
        case "ArrowUp":
          return addDays(focused, -7);
        case "ArrowDown":
          return addDays(focused, 7);
        case "Home":
          return startOfWeek(focused);
        case "End":
          return endOfWeek(focused);
        case "PageUp":
          return event.shiftKey
            ? addYears(focused, -1)
            : addMonths(focused, -1);
        case "PageDown":
          return event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1);
        default:
          return undefined;
      }
    })();
    if (next === undefined) return;
    event.preventDefault();
    move(next);
  }

  const label = formatLongDate(value);

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          disabled={disabled}
          data-slot="date-picker-trigger"
          data-focus-target
          aria-labelledby={`${fieldLabelId(id)} ${valueId}`}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          onBlur={onBlur}
          className={cn(
            "flex h-[51px] w-full min-w-0 items-center justify-between gap-3 rounded-field border-2 border-input bg-white px-4 py-3 text-left text-base text-foreground transition-[color,border-color] focus-visible:border-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          )}
        >
          <span
            id={valueId}
            className={value ? undefined : "text-muted-foreground"}
          >
            {value ? label : shownPlaceholder}
          </span>
          <Icon name="calendar" className="shrink-0 text-blue" aria-hidden />
        </button>
      </Popover.Trigger>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          role="dialog"
          aria-label={labels.dialogLabel}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            gridRef.current
              ?.querySelector<HTMLElement>(`[data-iso="${focused}"]`)
              ?.focus();
          }}
          className="z-[60] w-[320px] max-w-[calc(100vw-32px)] rounded-card bg-white p-4 text-foreground shadow-overlay outline-none"
        >
          <div className="mb-2 flex items-center justify-between">
            <MonthButton
              direction="previous"
              label={labels.previousMonth}
              disabled={prevDisabled}
              onClick={() => setFocused(addMonths(focused, -1))}
            />
            <div
              id={headingId}
              aria-live="polite"
              className="text-base font-bold"
            >
              {formatMonthYear(focused)}
            </div>
            <MonthButton
              direction="next"
              label={labels.nextMonth}
              disabled={nextDisabled}
              onClick={() => setFocused(addMonths(focused, 1))}
            />
          </div>
          <table
            ref={gridRef}
            role="grid"
            aria-labelledby={headingId}
            onKeyDown={onGridKeyDown}
            className="w-full border-separate border-spacing-0"
          >
            <thead>
              <tr>
                {weekdays.map((day) => (
                  <th
                    key={day.long}
                    scope="col"
                    abbr={day.long}
                    aria-label={day.long}
                    className="h-10 text-center text-xs font-semibold text-ink-3 uppercase"
                  >
                    {day.narrow}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]}>
                  {week.map((iso) => {
                    const allowed = isWithin(iso, min, max);
                    const selected = iso === value;
                    const isToday = iso === today;
                    const inMonth = sameMonth(iso, focused);
                    return (
                      <td
                        key={iso}
                        role="gridcell"
                        aria-selected={selected}
                        className="p-0 text-center"
                      >
                        <button
                          type="button"
                          data-iso={iso}
                          tabIndex={iso === focused ? 0 : -1}
                          aria-label={formatLongDate(iso)}
                          aria-current={isToday ? "date" : undefined}
                          aria-disabled={!allowed || undefined}
                          onFocus={() => setFocused(iso)}
                          onClick={() => choose(iso)}
                          className={cn(
                            "relative mx-auto grid size-10 place-content-center rounded-full text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue",
                            !inMonth && "text-ink-3/60",
                            allowed
                              ? "hover:bg-blue-tint-90"
                              : "cursor-not-allowed line-through opacity-40",
                            isToday && !selected && "font-bold text-blue",
                            selected &&
                              "bg-blue font-bold text-white hover:bg-blue",
                          )}
                        >
                          {Number(iso.slice(8))}
                          {isToday ? (
                            <span
                              aria-hidden
                              className={cn(
                                "absolute bottom-1 size-1 rounded-full",
                                selected ? "bg-white" : "bg-blue",
                              )}
                            />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              disabled={!todayAllowed}
              onClick={() => choose(today)}
              className="rounded-field px-3 py-2 text-sm font-semibold text-blue hover:bg-blue-tint-90 focus-visible:ring-2 focus-visible:ring-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {labels.today}
            </button>
            {clearable && value ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-field px-3 py-2 text-sm font-semibold text-destructive hover:bg-blue-tint-90 focus-visible:ring-2 focus-visible:ring-blue focus-visible:outline-none"
              >
                {labels.clear}
              </button>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MonthButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 place-content-center rounded-full text-blue hover:bg-blue-tint-90 focus-visible:ring-2 focus-visible:ring-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon
        name="chevronDown"
        className={direction === "previous" ? "rotate-90" : "-rotate-90"}
        aria-hidden
      />
    </button>
  );
}
