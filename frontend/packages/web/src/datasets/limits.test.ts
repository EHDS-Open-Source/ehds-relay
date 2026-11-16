import { expect, it } from "vitest";

import {
  DEFINITION_LIMIT,
  DESCRIPTION_LIMIT,
  PROVENANCE_LIMIT,
  TITLE_LIMIT,
} from "./limits";

it("reads the limits the backend enforces", () => {
  expect([
    TITLE_LIMIT,
    DESCRIPTION_LIMIT,
    PROVENANCE_LIMIT,
    DEFINITION_LIMIT,
  ]).toEqual([200, 2000, 2000, 500]);
});
