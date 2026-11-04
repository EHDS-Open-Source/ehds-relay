import { shellMessages } from "../../shell/messages";
import { AccessRightsField } from "../fields/AccessRightsField";
import { OrganisationField } from "../fields/OrganisationField";
import { TermListField } from "../fields/TermList";
import { FormSection } from "./FormSection";

export function AccessSection() {
  return (
    <FormSection id="access" title={shellMessages.datasetForm.sections.access}>
      <AccessRightsField />
      <TermListField name="applicable_legislation" required />
      {/* Needed to publish at every access level, so it is always shown */}
      <OrganisationField name="health_data_access_body" />
      <TermListField name="geographical_coverage" />
      <TermListField name="type" required />
    </FormSection>
  );
}
