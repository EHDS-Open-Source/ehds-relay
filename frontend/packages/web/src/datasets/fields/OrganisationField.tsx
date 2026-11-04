import { Field } from "@ehds-relay/ui";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import { GroupPanel, TextInput } from "./common";
import { ContactPointInputs } from "./ContactPoint";
import { TermPair } from "./TermList";

const text = shellMessages.datasetForm;

/** An organisation: name, type, contact point and, for the publisher, a description. */
export function OrganisationField({
  name,
}: {
  name: "health_data_access_body" | "health_data_holder" | "publisher";
}) {
  return (
    <Field label={fieldLabel(name)} anchorId={fieldAnchorId(name)} required>
      <GroupPanel className="flex flex-col gap-4">
        <TextInput path={`${name}.name`} label={text.organisation.name} />
        <Field label={text.organisation.type}>
          <TermPair path={`${name}.type`} />
        </Field>
        {name === "publisher" ? (
          <TextInput
            path="publisher.description"
            label={text.organisation.description}
            multiline
          />
        ) : null}
        <Field
          label={text.organisation.contactPoint}
          anchorId={fieldAnchorId(`${name}.contact_point`)}
          required
        >
          <ContactPointInputs path={`${name}.contact_point`} />
        </Field>
      </GroupPanel>
    </Field>
  );
}
