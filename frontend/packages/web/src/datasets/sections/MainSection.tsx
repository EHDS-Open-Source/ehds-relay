import { useWatch } from "react-hook-form";

import { shellMessages } from "../../shell/messages";
import type { DatasetFormValues } from "../formValues";
import { TagField, TextField, YesNoField } from "../fields/common";
import { DistributionsField } from "../fields/DistributionsField";
import { LangTextField } from "../fields/LangTextList";
import { TermListField } from "../fields/TermList";
import { VariablesField } from "../fields/VariablesField";
import { FormSection } from "./FormSection";

export function MainSection() {
  // Variables are asked for only when the data is structured
  const structured = useWatch<DatasetFormValues, "structured_data">({
    name: "structured_data",
  });
  return (
    <FormSection id="main" title={shellMessages.datasetForm.sections.main}>
      <LangTextField name="title" />
      <LangTextField name="description" />
      <DistributionsField />
      <YesNoField name="structured_data" />
      {structured === "yes" ? <VariablesField /> : null}
      <TextField name="provenance" multiline required />
      <TagField name="keyword" required />
      <TermListField name="health_theme" required />
      <TermListField name="health_category" required />
      <TermListField name="coding_system" />
      <YesNoField name="has_personal_data" />
      <TermListField name="conforms_to" required />
    </FormSection>
  );
}
