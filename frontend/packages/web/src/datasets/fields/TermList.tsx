import { Field, RepeatableList } from "@ehds-relay/ui";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import {
  emptyTerm,
  type DatasetFormValues,
  type TermListKey,
} from "../formValues";
import { GroupError, TextInput } from "./common";
import { type FormPath } from "./formState";

const text = shellMessages.datasetForm;

/** A name and web address pair, e.g. a vocabulary term typed in by hand. */
export function TermPair({ path }: { path: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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

/** Rows of name and web address pairs at a list path. */
export function TermRows({
  path,
  label,
}: {
  path: TermListKey | `distributions.${number}.applicable_legislation`;
  label: string;
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
        renderItem={(_, index) => <TermPair path={`${path}.${index}`} />}
      />
      <GroupError path={path} />
    </>
  );
}

/** A top-level field that is a list of name and web address pairs. */
export function TermListField({ name }: { name: TermListKey }) {
  return (
    <Field label={fieldLabel(name)} anchorId={fieldAnchorId(name)}>
      <TermRows path={name} label={fieldLabel(name)} />
    </Field>
  );
}
