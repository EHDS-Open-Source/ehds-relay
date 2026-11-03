import { shellMessages } from "../../shell/messages";
import { OrganisationField } from "../fields/OrganisationField";
import { FormSection } from "./FormSection";

export function OrganisationsSection() {
  return (
    <FormSection
      id="organisations"
      title={shellMessages.datasetForm.sections.organisations}
    >
      <OrganisationField name="health_data_holder" />
      <OrganisationField name="publisher" />
    </FormSection>
  );
}
