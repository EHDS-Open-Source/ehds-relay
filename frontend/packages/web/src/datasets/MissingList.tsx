import { Icon } from "@ehds-relay/ui";

import { shellMessages } from "../shell/messages";
import { fieldLabel } from "./fields";
import { focusField } from "./focus";

const text = shellMessages.datasetForm.missing;

/** "Not ready to publish": the fields still missing, each a button that goes to its field. */
export function MissingList({ missing }: { missing: readonly string[] }) {
  return (
    <section
      aria-labelledby="missing-for-publish-title"
      className="rounded-card bg-warning-bg p-6 text-ink"
    >
      <h2
        id="missing-for-publish-title"
        className="flex items-center gap-2 text-[length:var(--h4-size)] leading-[1.3] font-bold text-blue"
      >
        <Icon name="warning" size="md" />
        {text.title}
      </h2>
      <p className="mt-2 text-[0.95em]">{text.description}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {missing.map((key) => (
          <li key={key}>
            <button
              type="button"
              className="h-[34px] rounded-full border-2 border-blue-tint-80 bg-white px-4 text-[0.88em] font-semibold text-blue transition-colors hover:border-blue hover:bg-blue-tint-90"
              onClick={() => focusField(key)}
            >
              {fieldLabel(key)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
