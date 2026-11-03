import { Field, RepeatableList } from "@ehds-relay/ui";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import { emptyVariable, type DatasetFormValues } from "../formValues";
import { TextInput } from "./common";

const text = shellMessages.datasetForm;

/** The variables (columns) of structured data. */
export function VariablesField() {
  const { control } = useFormContext<DatasetFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variables",
  });
  const label = fieldLabel("variables");
  return (
    <Field label={label} anchorId={fieldAnchorId("variables")}>
      <RepeatableList
        items={fields}
        addLabel={text.addVariable}
        removeLabel={(i) => `${text.remove} ${text.variable.item} ${i + 1}`}
        onAdd={() => append(emptyVariable())}
        onRemove={remove}
        renderItem={(_, index) => {
          const path = `variables.${index}` as const;
          return (
            <Field
              label={`${text.variable.item} ${index + 1}`}
              className="rounded-2xl border p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput path={`${path}.name`} label={text.variable.name} />
                <TextInput
                  path={`${path}.data_type`}
                  label={text.variable.dataType}
                />
                <TextInput
                  path={`${path}.definition`}
                  label={text.variable.definition}
                  multiline
                  className="sm:col-span-2"
                />
                <TextInput
                  path={`${path}.coding_system`}
                  label={text.variable.codingSystem}
                  type="url"
                  inputMode="url"
                  className="sm:col-span-2"
                />
              </div>
            </Field>
          );
        }}
      />
    </Field>
  );
}
