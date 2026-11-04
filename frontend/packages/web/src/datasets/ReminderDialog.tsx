import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  FormMessage,
  Icon,
  Input,
  fieldErrorId,
} from "@ehds-relay/ui";
import { useState, type FormEvent } from "react";

import { shellMessages } from "../shell/messages";
import { errorStatus, useSetReminder } from "./queries";
import {
  REMINDER_MAX_YEARS_AHEAD,
  addYears,
  initialReminderDate,
  nextDay,
  reminderDateProblem,
  todayIso,
} from "./reminderDates";

const m = shellMessages.datasets.reminder;
const INPUT_ID = "reminder-date";

function saveErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 422:
      return m.errors.invalid;
    case 404:
      return m.errors.notFound;
    default:
      return m.errors.failed;
  }
}

export interface ReminderDialogProps {
  orgId: string;
  datasetId: string;
  /** The date now set, if any. */
  current: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Set, change or remove the date to be reminded to revalidate a dataset's metadata. */
export function ReminderDialog({
  orgId,
  datasetId,
  current,
  open,
  onOpenChange,
}: ReminderDialogProps) {
  const save = useSetReminder(orgId, datasetId);
  const [value, setValue] = useState(() => initialReminderDate(current));
  const [showProblem, setShowProblem] = useState(false);

  // Start fresh each time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initialReminderDate(current));
      setShowProblem(false);
      save.reset();
    }
  }

  const problem = reminderDateProblem(value);
  const fieldError = showProblem && problem ? m.problems[problem] : undefined;
  const today = todayIso();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) {
      setShowProblem(true);
      return;
    }
    save.mutate(value, { onSuccess: () => onOpenChange(false) });
  }

  function clear() {
    save.mutate(null, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Icon name="calendar" size="xl" />
              {m.dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.dialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field
            label={m.dateLabel}
            htmlFor={INPUT_ID}
            hint={m.dateHint}
            error={fieldError}
          >
            <Input
              id={INPUT_ID}
              type="date"
              value={value}
              min={nextDay(today)}
              max={addYears(today, REMINDER_MAX_YEARS_AHEAD)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? fieldErrorId(INPUT_ID) : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setShowProblem(true);
              }}
            />
          </Field>
          {save.isError ? (
            <FormMessage>{saveErrorMessage(save.error)}</FormMessage>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={save.isPending}>
              {m.cancel}
            </AlertDialogCancel>
            {current ? (
              <Button
                type="button"
                variant="secondary"
                disabled={save.isPending}
                onClick={clear}
              >
                {m.clear}
              </Button>
            ) : null}
            <Button type="submit" disabled={save.isPending}>
              {m.save}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
