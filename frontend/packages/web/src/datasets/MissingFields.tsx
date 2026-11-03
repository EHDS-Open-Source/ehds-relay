import { Link } from "@tanstack/react-router";

import { fieldAnchor, missingFieldLabel } from "./fields";

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
      <p className="mb-2 font-medium">{heading}</p>
      <ul className="list-disc space-y-1 pl-5">
        {missing.map((key) => (
          <li key={key}>
            <Link
              to="/orgs/$orgId/datasets/$datasetId/edit"
              params={{ orgId, datasetId }}
              hash={fieldAnchor(key)}
              className="text-primary underline-offset-4 hover:underline"
            >
              {missingFieldLabel(key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
