import {
  Button,
  EmptyState,
  PageHeader,
  StatusBadge,
  buttonVariants,
} from "@ehds-relay/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "@ehds-relay/ui";

import { DatasetRecord } from "../datasets/DatasetRecord";
import { MissingFields } from "../datasets/MissingFields";
import { errorStatus, useDataset, useDeleteDataset } from "../datasets/queries";
import { useDatasetRoute } from "../datasets/useDatasetRoute";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

const m = shellMessages.datasets;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function deleteErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 403:
      return m.deleteDialog.forbidden;
    case 404:
      return m.deleteDialog.notFound;
    default:
      return m.deleteDialog.failed;
  }
}

export function DatasetDetailPage() {
  const orgName = useOrgName();
  const { orgId, datasetId, isOwner } = useDatasetRoute();
  const query = useDataset(orgId, datasetId);
  const remove = useDeleteDataset(orgId, datasetId);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const catalogueLink = (
    <Link
      to="/orgs/$orgId/catalogue"
      params={{ orgId }}
      className={buttonVariants({ variant: "ghost" })}
    >
      {m.backToCatalogue}
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
    const missing = errorStatus(query.error) === 404;
    return (
      <EmptyState
        title={missing ? m.notFound.title : m.loadFailed}
        description={missing ? m.notFound.description : undefined}
        action={
          missing ? (
            catalogueLink
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => void query.refetch()}
            >
              {m.retry}
            </Button>
          )
        }
      />
    );
  }

  const dataset = query.data;
  const { metadata } = dataset;
  const title = dataset.title ?? m.untitled;
  const missing = dataset.missing_for_publish;
  const accessRights = metadata.access_rights;

  function confirmDelete() {
    remove.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        void navigate({ to: "/orgs/$orgId/catalogue", params: { orgId } });
      },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={title}
        description={dataset.description ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {catalogueLink}
            <Link
              to="/orgs/$orgId/datasets/$datasetId/export"
              params={{ orgId, datasetId }}
              className={buttonVariants({ variant: "outline" })}
            >
              {m.viewOutput}
            </Link>
            <Link
              to="/orgs/$orgId/datasets/$datasetId/edit"
              params={{ orgId, datasetId }}
              className={buttonVariants()}
            >
              {m.edit}
            </Link>
            {isOwner ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  remove.reset();
                  setConfirming(true);
                }}
              >
                {m.delete}
              </Button>
            ) : null}
          </div>
        }
      />

      <dl className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <dt className="text-sm text-muted-foreground">{m.status}</dt>
          <dd>
            <StatusBadge status={dataset.status} />
          </dd>
        </div>
        {accessRights ? (
          <div className="flex items-center gap-2">
            <dt className="text-sm text-muted-foreground">{m.accessLevel}</dt>
            <dd>{m.accessRights[accessRights]}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <dt className="text-sm text-muted-foreground">{m.lastChanged}</dt>
          <dd>
            <time dateTime={dataset.updated_at}>
              {dateFormat.format(new Date(dataset.updated_at))}
            </time>
          </dd>
        </div>
      </dl>

      {dataset.status === "draft" ? (
        <section
          aria-labelledby="draft-heading"
          className="mb-8 rounded-lg border bg-accent/40 p-5"
        >
          <h2 id="draft-heading" className="mb-2 text-lg font-semibold">
            {m.draft.title}
          </h2>
          <p className="mb-4">
            {missing.length > 0 ? m.draft.howToPublish : m.draft.complete}
          </p>
          {missing.length > 0 ? (
            <MissingFields
              orgId={orgId}
              datasetId={datasetId}
              missing={missing}
              heading={m.draft.missingTitle}
            />
          ) : null}
        </section>
      ) : null}

      <DatasetRecord metadata={metadata} />

      {isOwner ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={m.deleteDialog.title}
          description={m.deleteDialog.description}
          confirmLabel={m.deleteDialog.confirm}
          destructive
          pending={remove.isPending}
          error={remove.isError ? deleteErrorMessage(remove.error) : undefined}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
