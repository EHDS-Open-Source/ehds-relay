import { DatePicker, Field, fieldErrorId } from "@ehds-relay/ui";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import type { DatasetFormValues } from "../formValues";
import { GroupError, GroupPanel } from "./common";
import { inputId, useFieldError, useGroupState } from "./formState";

const text = shellMessages.datasetForm;

function DateInput({
  path,
  label,
  min,
  max,
}: {
  path: "temporal_coverage.start" | "temporal_coverage.end";
  label: string;
  min?: string;
  max?: string;
}) {
  const { control } = useFormContext<DatasetFormValues>();
  const error = useFieldError(path);
  const id = inputId(path);
  return (
    <Field label={label} htmlFor={id} error={error} errorId={fieldErrorId(id)}>
      <Controller
        control={control}
        name={path}
        render={({ field }) => (
          <DatePicker
            id={id}
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            min={min}
            max={max}
            clearable
            invalid={Boolean(error)}
            aria-describedby={error ? fieldErrorId(id) : undefined}
          />
        )}
      />
    </Field>
  );
}

/** Start and end date of the period the data covers. */
export function TemporalCoverageField() {
  const { invalid, error, errorId } = useGroupState("temporal_coverage");
  const { control } = useFormContext<DatasetFormValues>();
  // Each date limits the other: the period cannot end before it starts
  const [start, end] = useWatch({
    control,
    name: ["temporal_coverage.start", "temporal_coverage.end"],
  });
  return (
    <Field
      label={fieldLabel("temporal_coverage")}
      anchorId={fieldAnchorId("temporal_coverage")}
      invalid={invalid}
      describedBy={error ? errorId : undefined}
    >
      <GroupPanel className="grid gap-4 sm:grid-cols-2">
        <DateInput
          path="temporal_coverage.start"
          label={text.temporal.start}
          max={end || undefined}
        />
        <DateInput
          path="temporal_coverage.end"
          label={text.temporal.end}
          min={start || undefined}
        />
      </GroupPanel>
      <GroupError path="temporal_coverage" />
    </Field>
  );
}
