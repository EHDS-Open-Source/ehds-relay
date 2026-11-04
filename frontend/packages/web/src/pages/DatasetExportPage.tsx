import {
  Button,
  CodeBlock,
  EmptyState,
  Icon,
  LoadingStar,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  buttonVariants,
  useMinimumPending,
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
  const loading = useMinimumPending(query.isPending);

  if (loading || query.isPending) {
    return <LoadingStar size="page" message={m.output.loading} />;
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
          variant="secondary"
          size="sm"
          onBlue
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
  const { orgId, datasetId } = useDatasetRoute();
  const query = useDataset(orgId, datasetId);
  const search = useSearch({ from: "/orgs/$orgId/datasets/$datasetId/export" });
  const navigate = useNavigate();
  const format: ExportFormat = isExportFormat(search.format)
    ? search.format
    : "ttl";
  const loading = useMinimumPending(query.isPending);

  const backToRecord = (
    <Link
      to="/orgs/$orgId/datasets/$datasetId"
      params={{ orgId, datasetId }}
      className={buttonVariants({ variant: "secondary" })}
    >
      <Icon name="back" size="md" />
      {m.backToRecord}
    </Link>
  );

  if (loading || query.isPending) {
    return <LoadingStar size="page" message={m.loadingRecord} />;
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
        eyebrow={m.output.title}
        title={dataset.title ?? m.untitled}
        description={m.output.description}
        actions={backToRecord}
      />
      {missing.length > 0 ? (
        <div className="rounded-card bg-blue-tint-95 p-5">
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
