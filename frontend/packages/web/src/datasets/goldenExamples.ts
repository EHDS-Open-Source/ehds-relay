// The backend's golden example datasets, used by the form tests so both sides agree on them.
import nonPublicFull from "../../../../../backend/tests/golden/non_public_full.json";
import publicMinimal from "../../../../../backend/tests/golden/public_minimal.json";

import type { DatasetMetadata } from "./formValues";

export const goldenExamples = {
  non_public_full: nonPublicFull as DatasetMetadata,
  public_minimal: publicMinimal as DatasetMetadata,
};
