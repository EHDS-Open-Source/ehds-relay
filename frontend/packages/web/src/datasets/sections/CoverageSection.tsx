import { useWatch } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import type { DatasetFormValues } from "../formValues";
import { TagField, TextField } from "../fields/common";
import { TemporalCoverageField } from "../fields/TemporalCoverageField";
import { TermListField } from "../fields/TermList";
import { FormSection } from "./FormSection";

export function CoverageSection() {
  // Unique individuals are needed to publish only when the data has personal data
  const personal = useWatch<DatasetFormValues, "has_personal_data">({
    name: "has_personal_data",
  });
  return (
    <FormSection
      id="coverage"
      title={shellMessages.datasetForm.sections.coverage}
    >
      <TextField name="number_of_records" type="number" min={0} step={1} />
      <TextField
        name="number_of_unique_individuals"
        type="number"
        min={0}
        step={1}
        required={personal === "yes"}
      />
      <TermListField name="language" required />
      <TagField name="code_values" />
      <TemporalCoverageField />
    </FormSection>
  );
}
