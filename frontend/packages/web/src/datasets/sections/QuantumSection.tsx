import { shellMessages } from "../../shell/messages";
import { TextField } from "../fields/common";
import { FormSection } from "./FormSection";

export function QuantumSection() {
  return (
    <FormSection
      id="quantum"
      title={shellMessages.datasetForm.sections.quantum}
    >
      <TextField
        name="quantum_label"
        multiline
        hint={shellMessages.datasetForm.quantumHint}
      />
    </FormSection>
  );
}
