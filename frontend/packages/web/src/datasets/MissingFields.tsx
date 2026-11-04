import { Link } from "@tanstack/react-router";

import { fieldAnchorId, fieldLabel } from "./fields";

/** Checklist of what a dataset still needs, each item linking to its input in the edit form. */
export function MissingFields({
  orgId,
  datasetId,
  missing,
  heading,
}: {
  orgId: string;
  datasetId: string;
  missing: readonly string[];
  heading: string;
}) {
  return (
    <div>
      <p className="mb-2 font-semibold text-blue">{heading}</p>
      <ul className="list-disc space-y-1.5 pl-5 marker:text-blue">
        {missing.map((key) => (
          <li key={key}>
            <Link
              to="/orgs/$orgId/datasets/$datasetId/edit"
              params={{ orgId, datasetId }}
              hash={fieldAnchorId(key)}
              className="link"
            >
              {fieldLabel(key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
