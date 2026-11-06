import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/alert-dialog";
import { messages } from "../messages";
import { DatePicker, type DatePickerProps } from "./DatePicker";
import { Field } from "./Field";

const t = messages.datePicker;

// A Wednesday
const TODAY = "2026-11-04";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 4, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

function Harness(
  props: Partial<DatePickerProps> & { onChangeSpy?: (v: string) => void },
) {
  const { onChangeSpy, value: initial = "", ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <Field label="Reminder date" htmlFor="d" hint="Pick one" error={undefined}>
      <DatePicker
        id="d"
        name="when"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChangeSpy?.(v);
        }}
        {...rest}
      />
    </Field>
  );
}

const trigger = () => screen.getByRole("button", { name: /Reminder date/ });
const day = (name: string) => screen.getByRole("button", { name });
const heading = () => screen.getByRole("dialog").querySelector("[aria-live]");

describe("DatePicker", () => {
  it("shows the placeholder or the date in words, with the ISO value hidden", () => {
    const { container } = render(<Harness />);
    expect(trigger()).toHaveAccessibleName(`Reminder date ${t.placeholder}`);
    expect(container.querySelector("input[name=when]")).toHaveValue("");
  });

  it("names the trigger from the label and the date and announces its popup", () => {
    const { container } = render(<Harness value="2027-10-22" />);
    expect(trigger()).toHaveAccessibleName("Reminder date 22 October 2027");
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveAccessibleDescription("Pick one");
    expect(container.querySelector("input[name=when]")).toHaveValue(
      "2027-10-22",
    );
    expect(container.querySelector("input[name=when]")).toHaveAttribute(
      "type",
      "hidden",
    );
  });

  it("passes invalid and describedby on to the trigger", () => {
    render(<Harness invalid aria-describedby="oops" />);
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expect(trigger().getAttribute("aria-describedby")).toContain("oops");
  });

  it("opens from a click, Enter or Space and focuses the chosen day", async () => {
    const user = userEvent.setup();
    render(<Harness value="2027-10-22" />);
    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: t.dialogLabel }),
    ).toBeInTheDocument();
    expect(day("22 October 2027")).toHaveFocus();
    expect(heading()).toHaveTextContent("October 2027");
    await user.keyboard("{Escape}");
    expect(trigger()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(day("22 October 2027")).toHaveFocus();
    await user.keyboard("{Escape}");
    await user.keyboard(" ");
    expect(day("22 October 2027")).toHaveFocus();
  });

  it("starts on today, else the nearest allowed day", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);
    await user.click(trigger());
    expect(day("4 November 2026")).toHaveFocus();
    unmount();
    render(<Harness min="2026-12-10" max="2027-01-10" />);
    await user.click(trigger());
    expect(day("10 December 2026")).toHaveFocus();
    expect(heading()).toHaveTextContent("December 2026");
  });

  it("starts weeks on Monday with full weekday names", async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.getAttribute("aria-label"))).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(screen.getByRole("grid")).toHaveAccessibleName("November 2026");
  });

  it("marks today and the chosen day", async () => {
    const user = userEvent.setup();
    render(<Harness value="2026-11-10" />);
    await user.click(trigger());
    expect(day("4 November 2026")).toHaveAttribute("aria-current", "date");
    expect(day("10 November 2026").closest("td")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(day("11 November 2026").closest("td")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("moves with the arrows, Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness value="2026-11-11" />); // a Wednesday
    await user.click(trigger());
    await user.keyboard("{ArrowRight}");
    expect(day("12 November 2026")).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(day("10 November 2026")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(day("17 November 2026")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(day("3 November 2026")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(day("2 November 2026")).toHaveFocus();
    await user.keyboard("{End}");
    expect(day("8 November 2026")).toHaveFocus();
    // Into the next month: the shown month follows
    await user.keyboard("{ArrowRight}");
    expect(day("9 November 2026")).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(day("7 December 2026")).toHaveFocus();
    expect(heading()).toHaveTextContent("December 2026");
  });

  it("moves by month and year with the Page keys, clamping the day", async () => {
    const user = userEvent.setup();
    render(<Harness value="2027-01-31" />);
    await user.click(trigger());
    await user.keyboard("{PageDown}");
    expect(day("28 February 2027")).toHaveFocus();
    await user.keyboard("{PageUp}");
    expect(day("28 January 2027")).toHaveFocus();
    await user.keyboard("{Shift>}{PageDown}{/Shift}");
    expect(day("28 January 2028")).toHaveFocus();
    await user.keyboard("{Shift>}{PageUp}{/Shift}");
    expect(day("28 January 2027")).toHaveFocus();
  });

  it("clamps 29 February when moving a year", async () => {
    const user = userEvent.setup();
    render(<Harness value="2028-02-29" />);
    await user.click(trigger());
    await user.keyboard("{Shift>}{PageDown}{/Shift}");
    expect(day("28 February 2029")).toHaveFocus();
  });

  it("chooses with Enter and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { container } = render(<Harness onChangeSpy={spy} />);
    await user.click(trigger());
    await user.keyboard("{ArrowRight}{Enter}");
    expect(spy).toHaveBeenCalledWith("2026-11-05");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAccessibleName("Reminder date 5 November 2026");
    expect(container.querySelector("input[name=when]")).toHaveValue(
      "2026-11-05",
    );
  });

  it("chooses with Space and a click", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    await user.click(trigger());
    await user.keyboard("{ArrowDown} ");
    expect(spy).toHaveBeenLastCalledWith("2026-11-11");
    await user.click(trigger());
    await user.click(day("20 November 2026"));
    expect(spy).toHaveBeenLastCalledWith("2026-11-20");
  });

  it("closes on Escape without changing the value", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness value="2026-11-10" onChangeSpy={spy} />);
    await user.click(trigger());
    await user.keyboard("{ArrowRight}{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not let days outside the limits be chosen", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness min="2026-11-05" max="2026-11-20" onChangeSpy={spy} />);
    await user.click(trigger());
    expect(day("4 November 2026")).toHaveAttribute("aria-disabled", "true");
    expect(day("21 November 2026")).toHaveAttribute("aria-disabled", "true");
    expect(day("5 November 2026")).not.toHaveAttribute("aria-disabled");
    await user.click(day("4 November 2026"));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The keyboard can still pass over them, but not choose them
    expect(day("4 November 2026")).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowLeft}");
    expect(day("4 November 2026")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("disables month buttons when the whole month is out of range", async () => {
    const user = userEvent.setup();
    render(<Harness min="2026-11-01" max="2026-11-30" />);
    await user.click(trigger());
    expect(
      screen.getByRole("button", { name: t.previousMonth }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: t.nextMonth })).toBeDisabled();
  });

  it("changes month with the buttons", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: t.nextMonth }));
    expect(heading()).toHaveTextContent("December 2026");
    await user.click(screen.getByRole("button", { name: t.previousMonth }));
    await user.click(screen.getByRole("button", { name: t.previousMonth }));
    expect(heading()).toHaveTextContent("October 2026");
  });

  it("chooses today, unless it is out of range", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { unmount } = render(<Harness min="2026-11-05" onChangeSpy={spy} />);
    await user.click(trigger());
    expect(screen.getByRole("button", { name: t.today })).toBeDisabled();
    unmount();
    render(<Harness onChangeSpy={spy} />);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: t.today }));
    expect(spy).toHaveBeenCalledWith(TODAY);
  });

  it("offers Clear date only when clearable and set", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const first = render(<Harness value="2026-11-10" onChangeSpy={spy} />);
    await user.click(trigger());
    expect(
      screen.queryByRole("button", { name: t.clear }),
    ).not.toBeInTheDocument();
    first.unmount();
    const second = render(<Harness clearable onChangeSpy={spy} />);
    await user.click(trigger());
    expect(
      screen.queryByRole("button", { name: t.clear }),
    ).not.toBeInTheDocument();
    second.unmount();
    render(<Harness clearable value="2026-11-10" onChangeSpy={spy} />);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: t.clear }));
    expect(spy).toHaveBeenCalledWith("");
    expect(trigger()).toHaveAccessibleName(`Reminder date ${t.placeholder}`);
  });

  it("keeps a value outside the range shown as chosen", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness value="2026-10-01" min="2026-11-05" onChangeSpy={spy} />);
    await user.click(trigger());
    expect(day("1 October 2026").closest("td")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{Escape}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("closes only the calendar on Escape inside a dialog", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogDescription>Text</AlertDialogDescription>
          <Harness value="2026-11-10" />
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(trigger());
    expect(day("10 November 2026")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    // And a day can be chosen with a click in the portalled calendar
    await user.click(trigger());
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "12 November 2026",
      }),
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Reminder date 12 November 2026");
  });
});
