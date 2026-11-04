import { Field, RepeatableList } from "@ehds-relay/ui";
import { useFieldArray, useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import type { DatasetFormValues } from "../formValues";
import { GroupPanel, TextInput } from "./common";

const text = shellMessages.datasetForm;

/** A text in one or more languages: rows of a language code and the text. */
export function LangTextField({ name }: { name: "title" | "description" }) {
  const { control } = useFormContext<DatasetFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const label = fieldLabel(name);
  return (
    <Field label={label} anchorId={fieldAnchorId(name)} required>
      <RepeatableList
        items={fields}
        minItems={1}
        addLabel={text.addLanguage}
        removeLabel={(i) => `${text.remove} ${label} ${i + 1}`}
        onAdd={() => append({ lang: "", text: "" })}
        onRemove={remove}
        renderItem={(_, index) => (
          <GroupPanel className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <TextInput
              path={`${name}.${index}.lang`}
              label={text.langText.lang}
              autoComplete="off"
            />
            <TextInput
              path={`${name}.${index}.text`}
              label={index === 0 ? label : `${label} ${index + 1}`}
              multiline={name === "description"}
            />
          </GroupPanel>
        )}
      />
    </Field>
  );
}
