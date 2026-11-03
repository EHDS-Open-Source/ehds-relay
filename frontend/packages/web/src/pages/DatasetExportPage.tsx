import {
  Button,
  CodeBlock,
  EmptyState,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  buttonVariants,
} from "@ehds-relay/ui";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";

import {
  downloadText,
  exportFileName,
  exportFormatInfo,
  exportFormats,
  isExportFormat,
  type ExportFormat,
} from "../datasets/download";
import { MissingFields } from "../datasets/MissingFields";
import { ValidationPanel } from "../datasets/ValidationPanel";
import {
  errorStatus,
  useDataset,
  useDatasetExport,
  type Dataset,
} from "../datasets/queries";
import { useDatasetRoute } from "../datasets/useDatasetRoute";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

const m = shellMessages.datasets;

function OutputTab({
  dataset,
  format,
  active,
}: {
  dataset: Dataset;
  format: ExportFormat;
  active: boolean;
}) {
  const query = useDatasetExport(dataset.org_id, dataset.id, format, active);
  const info = exportFormatInfo(format);
  const label = m.output.tabs[format];

  if (query.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {m.output.loading}
      </p>
    );
  }
  if (query.isError) {
    const status = errorStatus(query.error);
    // 501: the export is not built yet on the server
    if (status === 501) {
      return <EmptyState title={m.output.unavailable} />;
    }
    return (
      <EmptyState
        title={m.output.failed}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {m.retry}
          </Button>
        }
      />
    );
  }
  return (
    <CodeBlock
      text={query.data}
      label={label}
      actions={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            downloadText(
              query.data,
              exportFileName(dataset.title, format, m.output.fallbackName),
              info.mediaType,
            );
          }}
        >
          {m.output.downloadAs.replace("{ext}", info.extension)}
        </Button>
      }
    />
  );
}

export function DatasetExportPage() {
  const orgName = useOrgName();
  const { orgId, datasetId } = useDatasetRoute();
  const query = useDataset(orgId, datasetId);
  const search = useSearch({ from: "/orgs/$orgId/datasets/$datasetId/export" });
  const navigate = useNavigate();
  const format: ExportFormat = isExportFormat(search.format)
    ? search.format
    : "ttl";

  const backToRecord = (
    <Link
      to="/orgs/$orgId/datasets/$datasetId"
      params={{ orgId, datasetId }}
      className={buttonVariants({ variant: "ghost" })}
    >
      {m.backToRecord}
    </Link>
  );

  if (query.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {shellMessages.loading}
      </p>
    );
  }
  if (query.isError) {
    const notFound = errorStatus(query.error) === 404;
    return (
      <EmptyState
        title={notFound ? m.notFound.title : m.loadFailed}
        description={notFound ? m.notFound.description : undefined}
        action={backToRecord}
      />
    );
  }

  const dataset = query.data;
  const missing = dataset.missing_for_publish;

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={dataset.title ?? m.untitled}
        description={m.output.description}
        actions={backToRecord}
      />
      {missing.length > 0 ? (
        <div className="rounded-lg border bg-accent/40 p-5">
          <p className="mb-4">{m.output.incomplete}</p>
          <MissingFields
            orgId={orgId}
            datasetId={datasetId}
            missing={missing}
            heading={m.output.incompleteMissing}
          />
        </div>
      ) : (
        <>
          <ValidationPanel orgId={orgId} datasetId={datasetId} />
          <Tabs
            value={format}
            onValueChange={(value) => {
              if (!isExportFormat(value)) return;
              void navigate({
                to: "/orgs/$orgId/datasets/$datasetId/export",
                params: { orgId, datasetId },
                search: { format: value },
                replace: true,
              });
            }}
          >
            <TabsList>
              {exportFormats.map((f) => (
                <TabsTrigger key={f.format} value={f.format}>
                  {m.output.tabs[f.format]}
                </TabsTrigger>
              ))}
            </TabsList>
            {exportFormats.map((f) => (
              <TabsContent key={f.format} value={f.format}>
                <OutputTab
                  dataset={dataset}
                  format={f.format}
                  active={f.format === format}
                />
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </>
  );
}
