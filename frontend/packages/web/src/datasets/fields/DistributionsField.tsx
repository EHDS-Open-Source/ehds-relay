import { Field, RepeatableList } from "@ehds-relay/ui";
import type { ReactNode } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import { emptyDistribution, type DatasetFormValues } from "../formValues";
import { TextInput } from "./common";
import { panelClass, useGroupState } from "./formState";
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
  const { invalid, error, errorId } = useGroupState("distributions");
  return (
    <Field
      label={label}
      anchorId={fieldAnchorId("distributions")}
      required
      invalid={invalid}
      describedBy={error ? errorId : undefined}
    >
      <RepeatableList
        items={fields}
        error={error}
        errorId={errorId}
        addLabel={text.addDistribution}
        removeLabel={(i) => `${text.remove} ${text.distribution.item} ${i + 1}`}
        onAdd={() => append(emptyDistribution())}
        onRemove={remove}
        renderItem={(_, index) => {
          const path = `distributions.${index}` as const;
          return (
            // The panel wraps the group, so its heading sits inside the pale panel
            <div className={panelClass}>
              <Field label={`${text.distribution.item} ${index + 1}`}>
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
                  <SubGroup
                    path={`${path}.format`}
                    label={text.distribution.format}
                  >
                    <TermPair path={`${path}.format`} />
                  </SubGroup>
                  <SubGroup
                    path={`${path}.applicable_legislation`}
                    label={text.distribution.legislation}
                  >
                    <TermRows
                      nested
                      path={`${path}.applicable_legislation`}
                      label={text.distribution.legislation}
                    />
                  </SubGroup>
                </div>
              </Field>
            </div>
          );
        }}
      />
    </Field>
  );
}

/** A group inside a distribution, described by the message its list shows. */
function SubGroup({
  path,
  label,
  children,
}: {
  path: string;
  label: string;
  children: ReactNode;
}) {
  const { invalid, error, errorId } = useGroupState(path);
  return (
    <Field
      label={label}
      invalid={invalid}
      describedBy={error ? errorId : undefined}
    >
      {children}
    </Field>
  );
}
