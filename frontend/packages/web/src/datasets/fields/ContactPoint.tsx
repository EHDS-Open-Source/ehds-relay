import { Field, RepeatableList } from "@ehds-relay/ui";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import { emptyContactPoint, type DatasetFormValues } from "../formValues";
import { GroupPanel, TextInput } from "./common";
import { useGroupState, type FormPath } from "./formState";

const text = shellMessages.datasetForm;

/** Name and email of a contact point. */
export function ContactPointInputs({ path }: { path: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput
        path={`${path}.name` as FormPath}
        label={text.contactPoint.name}
      />
      <TextInput
        path={`${path}.email` as FormPath}
        label={text.contactPoint.email}
        type="email"
        autoComplete="off"
      />
    </div>
  );
}

/** The dataset's contact points. */
export function ContactPointsField() {
  const { control } = useFormContext<DatasetFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "contact_points",
  });
  const label = fieldLabel("contact_points");
  const { invalid, error, errorId } = useGroupState("contact_points");
  return (
    <Field
      label={label}
      anchorId={fieldAnchorId("contact_points")}
      required
      invalid={invalid}
      describedBy={error ? errorId : undefined}
    >
      <RepeatableList
        items={fields}
        error={error}
        errorId={errorId}
        addLabel={text.addContactPoint}
        removeLabel={(i) => `${text.remove} ${label} ${i + 1}`}
        onAdd={() => append(emptyContactPoint())}
        onRemove={remove}
        renderItem={(_, index) => (
          <GroupPanel>
            <ContactPointInputs path={`contact_points.${index}`} />
          </GroupPanel>
        )}
      />
    </Field>
  );
}
