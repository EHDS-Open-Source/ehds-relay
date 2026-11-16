import {
  zDescriptionText,
  zTitleText,
  zVariable,
  zDatasetMetadata,
} from "@ehds-relay/api-client";

// Maximum lengths of the long text fields, read from the generated schemas so the form
// follows the server.

export const TITLE_LIMIT = zTitleText.shape.text.maxLength ?? 200;
export const DESCRIPTION_LIMIT = zDescriptionText.shape.text.maxLength ?? 2000;
export const PROVENANCE_LIMIT =
  zDatasetMetadata.shape.provenance.unwrap().unwrap().maxLength ?? 2000;
export const DEFINITION_LIMIT = zVariable.shape.definition.maxLength ?? 500;
