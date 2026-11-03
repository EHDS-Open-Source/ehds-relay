import { shellMessages } from "../../shell/messages";
import { TagField } from "../fields/common";
import { ContactPointsField } from "../fields/ContactPoint";
import { TermListField } from "../fields/TermList";
import { FormSection } from "./FormSection";

export function TechnicalSection() {
  return (
    <FormSection
      id="technical"
      title={shellMessages.datasetForm.sections.technical}
    >
      <ContactPointsField />
      <TagField name="identifier" />
      <TermListField name="generated_by" />
    </FormSection>
  );
}
