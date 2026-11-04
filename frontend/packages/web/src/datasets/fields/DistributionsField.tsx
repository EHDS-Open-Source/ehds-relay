import { Field, RepeatableList } from "@ehds-relay/ui";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import { emptyDistribution, type DatasetFormValues } from "../formValues";
import { TextInput } from "./common";
import { panelClass } from "./formState";
import { TermPair, TermRows } from "./TermList";

const text = shellMessages.datasetForm;

/** The ways the data is made available: an access address and the legislation for each. */
export function DistributionsField() {
  const { control } = useFormContext<DatasetFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "distributions",
  });
  const label = fieldLabel("distributions");
  return (
    <Field label={label} anchorId={fieldAnchorId("distributions")} required>
      <RepeatableList
        items={fields}
        addLabel={text.addDistribution}
        removeLabel={(i) => `${text.remove} ${text.distribution.item} ${i + 1}`}
        onAdd={() => append(emptyDistribution())}
        onRemove={remove}
        renderItem={(_, index) => {
          const path = `distributions.${index}` as const;
          return (
            <Field
              label={`${text.distribution.item} ${index + 1}`}
              className={panelClass}
            >
              <div className="flex flex-col gap-4">
                <TextInput
                  path={`${path}.access_url`}
                  label={text.distribution.accessUrl}
                  type="url"
                  inputMode="url"
                />
                <TextInput
                  path={`${path}.title`}
                  label={text.distribution.title}
                />
                <TextInput
                  path={`${path}.description`}
                  label={text.distribution.description}
                  multiline
                />
                <Field label={text.distribution.format}>
                  <TermPair path={`${path}.format`} />
                </Field>
                <Field label={text.distribution.legislation}>
                  <TermRows
                    nested
                    path={`${path}.applicable_legislation`}
                    label={text.distribution.legislation}
                  />
                </Field>
              </div>
            </Field>
          );
        }}
      />
    </Field>
  );
}
