import { shellMessages } from "../shell/messages";
import { fieldLabel } from "./fields";
import { focusField } from "./focus";

const text = shellMessages.datasetForm.missing;

/** "Not ready to publish": the fields still missing, each a button that goes to its field. */
export function MissingList({ missing }: { missing: readonly string[] }) {
  return (
    <section
      aria-labelledby="missing-for-publish-title"
      className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-5"
    >
      <h2 id="missing-for-publish-title" className="font-semibold">
        {text.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{text.description}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {missing.map((key) => (
          <li key={key}>
            <button
              type="button"
              className="rounded-full border bg-background px-3 py-1 text-sm underline-offset-2 hover:underline"
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
