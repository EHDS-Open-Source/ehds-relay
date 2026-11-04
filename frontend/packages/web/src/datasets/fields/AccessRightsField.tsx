import { Field, RadioChoices, fieldErrorId } from "@ehds-relay/ui";
import { useFormContext } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import type { AccessRights, DatasetFormValues } from "../formValues";
import { inputId, useFieldError } from "./formState";

const text = shellMessages.datasetForm;
const levels: readonly AccessRights[] = ["public", "restricted", "non_public"];

/** Access level, each choice with a one-line explanation. */
export function AccessRightsField() {
  const { register } = useFormContext<DatasetFormValues>();
  const error = useFieldError("access_rights");
  return (
    <Field
      label={fieldLabel("access_rights")}
      anchorId={fieldAnchorId("access_rights")}
      required
      error={error}
      errorId={fieldErrorId(inputId("access_rights"))}
    >
      <RadioChoices
        idPrefix={inputId("access_rights")}
        choices={levels.map((level) => ({
          value: level,
          ...text.accessRights[level],
        }))}
        {...register("access_rights")}
      />
    </Field>
  );
}
