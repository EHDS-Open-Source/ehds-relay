import { Field, RepeatableList, fieldErrorId } from "@ehds-relay/ui";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import {
  emptyTerm,
  type DatasetFormValues,
  type TermListKey,
} from "../formValues";
import { GroupError, GroupPanel, TextInput } from "./common";
import { inputId, useGroupError, type FormPath } from "./formState";

const text = shellMessages.datasetForm;

/** A name and web address pair, e.g. a vocabulary term typed in by hand. */
export function TermPair({ path }: { path: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput path={`${path}.label` as FormPath} label={text.term.label} />
      <TextInput
        path={`${path}.uri` as FormPath}
        label={text.term.uri}
        type="url"
        inputMode="url"
      />
    </div>
  );
}

/**
 * Rows of name and web address pairs at a list path. Each row sits on a pale panel unless
 * the list is itself inside one (`nested`); `hideError` leaves the list's own message to
 * the caller.
 */
export function TermRows({
  path,
  label,
  nested,
  hideError,
}: {
  path: TermListKey | `distributions.${number}.applicable_legislation`;
  label: string;
  nested?: boolean;
  hideError?: boolean;
}) {
  const { control } = useFormContext<DatasetFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: path });
  return (
    <>
      <RepeatableList
        items={fields}
        addLabel={text.addTerm}
        removeLabel={(i) => `${text.remove} ${label} ${i + 1}`}
        onAdd={() => append(emptyTerm())}
        onRemove={remove}
        renderItem={(_, index) =>
          nested ? (
            <TermPair path={`${path}.${index}`} />
          ) : (
            <GroupPanel>
              <TermPair path={`${path}.${index}`} />
            </GroupPanel>
          )
        }
      />
      {hideError ? null : <GroupError path={path} />}
    </>
  );
}

/** A top-level field that is a list of name and web address pairs. */
export function TermListField({
  name,
  required,
}: {
  name: TermListKey;
  required?: boolean;
}) {
  const error = useGroupError(name);
  return (
    <Field
      label={fieldLabel(name)}
      anchorId={fieldAnchorId(name)}
      required={required}
      error={error}
      errorId={fieldErrorId(inputId(name))}
    >
      <TermRows path={name} label={fieldLabel(name)} hideError />
    </Field>
  );
}
