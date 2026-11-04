import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ConfirmDialog,
  Field,
  FormMessage,
  Icon,
  Input,
  fieldErrorId,
  useToast,
} from "@ehds-relay/ui";
import { useState, type FormEvent } from "react";

import { shellMessages } from "../shell/messages";
import { errorStatus, useSetReminder } from "./queries";
import {
  REMINDER_MAX_YEARS_AHEAD,
  addYears,
  initialReminderDate,
  isIsoDate,
  nextDay,
  reminderDateProblem,
  todayIso,
} from "./reminderDates";

const m = shellMessages.datasets.reminder;
const INPUT_ID = "reminder-date";

const longDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A `YYYY-MM-DD` date written out in full, e.g. "4 November 2027". */
function longDate(iso: string): string {
  return isIsoDate(iso)
    ? longDateFormat.format(new Date(`${iso}T00:00:00Z`))
    : iso;
}

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
  /** Named in the confirmation before the reminder is cleared. */
  datasetTitle: string;
  /** The date now set, if any. */
  current: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Set, change or remove the date to be reminded to revalidate a dataset's metadata. */
export function ReminderDialog({
  orgId,
  datasetId,
  datasetTitle,
  current,
  open,
  onOpenChange,
}: ReminderDialogProps) {
  const save = useSetReminder(orgId, datasetId);
  const toast = useToast();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [value, setValue] = useState(() => initialReminderDate(current));
  const [showProblem, setShowProblem] = useState(false);

  // Start fresh each time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initialReminderDate(current));
      setShowProblem(false);
      setConfirmingClear(false);
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
    save.mutate(value, {
      onSuccess: () => {
        onOpenChange(false);
        toast.show({ tone: "success", message: m.savedToast(longDate(value)) });
      },
    });
  }

  function clear() {
    save.mutate(null, {
      onSuccess: () => {
        setConfirmingClear(false);
        onOpenChange(false);
        toast.show({ tone: "success", message: m.clearedToast });
      },
    });
  }

  const clearing = confirmingClear && save.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="data-[size=default]:max-w-[min(420px,calc(100%-40px))]"
        onOverlayClick={() => {
          if (!save.isPending) onOpenChange(false);
        }}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Icon name="calendar" size="lg" />
              {m.dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.dialogDescription}
            </AlertDialogDescription>
            {current ? (
              <p>
                {m.saved}{" "}
                <strong className="font-bold">
                  <time dateTime={current}>{longDate(current)}</time>
                </strong>
              </p>
            ) : null}
          </AlertDialogHeader>
          <Field
            label={m.dateLabel}
            htmlFor={INPUT_ID}
            hint={m.dateHint}
            error={fieldError}
            required
          >
            <Input
              id={INPUT_ID}
              type="date"
              value={value}
              min={nextDay(today)}
              max={addYears(today, REMINDER_MAX_YEARS_AHEAD)}
              required
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? fieldErrorId(INPUT_ID) : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setShowProblem(true);
              }}
            />
          </Field>
          {save.isError && !confirmingClear ? (
            <FormMessage>{saveErrorMessage(save.error)}</FormMessage>
          ) : null}
          {/* Cancel on the left; Clear reminder and Save on the right. */}
          <AlertDialogFooter className="justify-between max-[480px]:flex-col-reverse">
            <AlertDialogCancel
              type="button"
              size="sm"
              disabled={save.isPending}
            >
              {m.cancel}
            </AlertDialogCancel>
            <div className="flex flex-wrap gap-2 max-[480px]:flex-col-reverse max-[480px]:*:w-full">
              {current ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => {
                    save.reset();
                    setConfirmingClear(true);
                  }}
                >
                  {m.clear}
                </Button>
              ) : null}
              <Button
                type="submit"
                size="sm"
                busy={save.isPending && !confirmingClear}
              >
                {m.save}
                <Icon name="save" size="sm" />
              </Button>
            </div>
          </AlertDialogFooter>
        </form>
        {current ? (
          <ConfirmDialog
            open={confirmingClear}
            onOpenChange={(next) => {
              if (!save.isPending) setConfirmingClear(next);
            }}
            icon="calendarUpdate"
            title={m.clearDialog.title(datasetTitle)}
            description={
              <>
                {m.clearDialog.lead}{" "}
                <strong className="font-bold">{longDate(current)}</strong>{" "}
                {m.clearDialog.trail}
              </>
            }
            confirmLabel={m.clearDialog.confirm}
            destructive
            pending={clearing}
            error={
              confirmingClear && save.isError
                ? saveErrorMessage(save.error)
                : undefined
            }
            onConfirm={clear}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
