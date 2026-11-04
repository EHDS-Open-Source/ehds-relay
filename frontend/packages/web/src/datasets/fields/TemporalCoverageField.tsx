import { Field } from "@ehds-relay/ui";

import { shellMessages } from "../../shell/messages";
import { fieldAnchorId, fieldLabel } from "../fields";
import { GroupError, GroupPanel, TextInput } from "./common";

const text = shellMessages.datasetForm;

/** Start and end date of the period the data covers. */
export function TemporalCoverageField() {
  return (
    <Field
      label={fieldLabel("temporal_coverage")}
      anchorId={fieldAnchorId("temporal_coverage")}
    >
      <GroupPanel className="grid gap-4 sm:grid-cols-2">
        <TextInput
          path="temporal_coverage.start"
          label={text.temporal.start}
          type="date"
        />
        <TextInput
          path="temporal_coverage.end"
          label={text.temporal.end}
          type="date"
        />
      </GroupPanel>
      <GroupError path="temporal_coverage" />
    </Field>
  );
}
