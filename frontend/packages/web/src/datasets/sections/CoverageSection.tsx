import { shellMessages } from "../../shell/messages";
import { TagField, TextField } from "../fields/common";
import { TemporalCoverageField } from "../fields/TemporalCoverageField";
import { TermListField } from "../fields/TermList";
import { FormSection } from "./FormSection";

export function CoverageSection() {
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
      />
      <TermListField name="language" />
      <TagField name="code_values" />
      <TemporalCoverageField />
    </FormSection>
  );
}
