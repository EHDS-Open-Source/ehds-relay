import { zDatasetMetadata } from "@ehds-relay/api-client";

// Limits for tag inputs. Only keywords have a rule on the server, so only they are limited;
// the numbers come from the generated schema.

export interface TagLimits {
  /** Most characters in one tag. */
  maxLength: number;
  /** Most tags. */
  maxTags: number;
}

const keywordArray = zDatasetMetadata.shape.keyword.unwrap();

/** The number a Zod array "max" check holds, if the schema has one. */
function arrayMax(): number | undefined {
  for (const check of keywordArray._zod.def.checks ?? []) {
    const def = (
      check as { _zod?: { def?: { check?: string; maximum?: unknown } } }
    )._zod?.def;
    if (def?.check === "max_length" && typeof def.maximum === "number") {
      return def.maximum;
    }
  }
  return undefined;
}

export const KEYWORD_LIMITS: TagLimits = {
  maxLength: keywordArray.element.maxLength ?? 50,
  maxTags: arrayMax() ?? 20,
};

/** The limits for a tag field, or none for fields the server does not limit. */
export function tagLimits(
  name: "keyword" | "code_values" | "identifier",
): Partial<TagLimits> {
  return name === "keyword" ? KEYWORD_LIMITS : {};
}
