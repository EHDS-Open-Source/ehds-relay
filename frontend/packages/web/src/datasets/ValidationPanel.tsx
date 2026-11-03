import { Button } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import { shellMessages } from "../shell/messages";
import { fieldAnchorId, fieldLabel } from "./fields";
import {
  errorStatus,
  useDatasetValidation,
  type ValidationReport,
} from "./queries";

const m = shellMessages.datasets;
const v = m.validation;

interface Item {
  key: string;
  field: string | null;
  message: string;
  severity: ValidationReport["violations"][number]["severity"];
}

function itemsOf(report: ValidationReport): Item[] {
  const missing: Item[] = report.missing.map((field) => ({
    key: `missing-${field}`,
    field,
    message: v.notFilledIn,
    severity: "violation",
  }));
  const results: Item[] = report.violations.map((r, i) => ({
    key: `result-${String(i)}`,
    field: r.field ?? null,
    message: r.message,
    severity: r.severity,
  }));
  return [...missing, ...results];
}

function ItemList({
  orgId,
  datasetId,
  items,
}: {
  orgId: string;
  datasetId: string;
  items: Item[];
}) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item.key}>
          <span className="sr-only">{v.severity[item.severity]}: </span>
          {item.field ? (
            <Link
              to="/orgs/$orgId/datasets/$datasetId/edit"
              params={{ orgId, datasetId }}
              hash={fieldAnchorId(item.field)}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {fieldLabel(item.field)}
            </Link>
          ) : (
            <span className="font-medium">{v.wholeRecord}</span>
          )}{" "}
          <span className="text-muted-foreground">{item.message}</span>
        </li>
      ))}
    </ul>
  );
}

/** Whether the record passes the official Health DCAT-AP checks, and what to fix if not. */
export function ValidationPanel({
  orgId,
  datasetId,
}: {
  orgId: string;
  datasetId: string;
}) {
  const query = useDatasetValidation(orgId, datasetId);

  let body;
  if (query.isPending) {
    body = (
      <p role="status" className="text-muted-foreground">
        {v.checking}
      </p>
    );
  } else if (query.isError) {
    // 501: the checks are not built yet on the server
    body =
      errorStatus(query.error) === 501 ? (
        <p className="text-muted-foreground">{v.unavailable}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground">{v.failed}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {m.retry}
          </Button>
        </div>
      );
  } else {
    const report = query.data;
    const items = itemsOf(report);
    const problems = items.filter((i) => i.severity === "violation");
    const notes = items.filter((i) => i.severity !== "violation");
    body = report.conforms ? (
      <div role="status">
        <p className="font-medium">
          {notes.length > 0 ? v.warnings : v.passes}
        </p>
        <p className="text-muted-foreground">{v.passesDetail}</p>
        {notes.length > 0 ? (
          <ItemList orgId={orgId} datasetId={datasetId} items={notes} />
        ) : null}
      </div>
    ) : (
      <div role="alert">
        <p className="font-medium">{v.fails}</p>
        <p className="text-muted-foreground">{v.failsDetail}</p>
        <ItemList
          orgId={orgId}
          datasetId={datasetId}
          items={[...problems, ...notes]}
        />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="validation-title"
      className="mb-6 rounded-lg border p-5"
    >
      <h2 id="validation-title" className="mb-2 text-lg font-semibold">
        {v.title}
      </h2>
      {body}
    </section>
  );
}
