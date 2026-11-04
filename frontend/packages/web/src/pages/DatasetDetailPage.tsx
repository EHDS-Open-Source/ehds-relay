import {
  Button,
  DetailPill,
  EmptyState,
  Icon,
  LoadingStar,
  PageHeader,
  Ribbon,
  StatusBadge,
  ConfirmDialog,
  buttonVariants,
  datasetStarColour,
  useToast,
} from "@ehds-relay/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DatasetRecord } from "../datasets/DatasetRecord";
import { MissingFields } from "../datasets/MissingFields";
import { ReminderDialog } from "../datasets/ReminderDialog";
import { formatIsoDate, todayIso } from "../datasets/reminderDates";
import { errorStatus, useDataset, useDeleteDataset } from "../datasets/queries";
import { useDatasetRoute } from "../datasets/useDatasetRoute";
import { RibbonPortal } from "../shell/RibbonSlot";
import { shellMessages } from "../shell/messages";

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
  const { orgId, datasetId, isOwner } = useDatasetRoute();
  const query = useDataset(orgId, datasetId);
  const remove = useDeleteDataset(orgId, datasetId);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  const [reminderOpen, setReminderOpen] = useState(false);

  const catalogueLink = (
    <Link
      to="/orgs/$orgId/catalogue"
      params={{ orgId }}
      className={buttonVariants({ variant: "secondary" })}
    >
      <Icon name="back" size="md" />
      {m.backToCatalogue}
    </Link>
  );

  if (query.isPending) {
    return <LoadingStar size="page" message={shellMessages.loading} />;
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
        toast.show({ tone: "success", message: m.deleteDialog.deleted });
        void navigate({ to: "/orgs/$orgId/catalogue", params: { orgId } });
      },
    });
  }

  const reminderDate = dataset.reminder_date;
  const reminderPassed = reminderDate ? reminderDate <= todayIso() : false;
  const openReminder = () => setReminderOpen(true);

  return (
    <>
      {reminderDate ? (
        <RibbonPortal>
          {reminderPassed ? (
            <Ribbon
              tone="overdue"
              detail={m.ribbon.overdueDetail}
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="border-blue hover:bg-blue hover:text-yellow"
                  onClick={openReminder}
                >
                  {m.ribbon.setNext}
                </Button>
              }
            >
              {m.ribbon.overdueSince} {formatIsoDate(reminderDate)}
            </Ribbon>
          ) : (
            <Ribbon>
              {m.ribbon.due} <strong>{formatIsoDate(reminderDate)}</strong>
            </Ribbon>
          )}
        </RibbonPortal>
      ) : null}

      <PageHeader
        eyebrow={m.context}
        title={title}
        titleAdornment={
          <Icon
            name="star"
            size="display-sm"
            style={{ color: datasetStarColour(datasetId) }}
          />
        }
        description={dataset.description ?? undefined}
        actions={
          <>
            <Button type="button" size="record" onClick={openReminder}>
              <Icon name="calendar" size="lg" />
              {reminderDate ? m.reminder.update : m.reminder.button}
            </Button>
            <Link
              to="/orgs/$orgId/datasets/$datasetId/edit"
              params={{ orgId, datasetId }}
              className={buttonVariants({
                variant: "secondary",
                size: "record",
              })}
            >
              <Icon name="edit" size="lg" />
              {m.edit}
            </Link>
          </>
        }
      />

      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-2.5">
        <StatusBadge status={dataset.status} />
        {dataset.overdue ? (
          <DetailPill
            icon="warning"
            className="bg-warning-bg text-warning-on-white"
          >
            <span title={m.overdueHint}>{m.overdue}</span>
          </DetailPill>
        ) : null}
        {accessRights ? (
          <DetailPill icon="lock">
            {m.accessLevel}: {m.accessRights[accessRights]}
          </DetailPill>
        ) : null}
        <DetailPill icon="edit">
          {m.lastChanged}{" "}
          <time dateTime={dataset.updated_at}>
            {dateFormat.format(new Date(dataset.updated_at))}
          </time>
        </DetailPill>
        {dataset.last_validated_at ? (
          <DetailPill icon="tick">
            {m.lastValidated}{" "}
            <time dateTime={dataset.last_validated_at}>
              {dateFormat.format(new Date(dataset.last_validated_at))}
            </time>
          </DetailPill>
        ) : null}
        <DetailPill icon="calendar">
          {m.reminder.fact}:{" "}
          <span>
            <ReminderFact
              date={dataset.reminder_date}
              setBy={dataset.reminder_set_by_name}
            />
          </span>
        </DetailPill>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          to="/orgs/$orgId/datasets/$datasetId/export"
          params={{ orgId, datasetId }}
          className={buttonVariants({ variant: "secondary" })}
        >
          {m.viewOutput}
        </Link>
        {isOwner ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              remove.reset();
              setConfirming(true);
            }}
          >
            <Icon name="remove" size="md" />
            {m.delete}
          </Button>
        ) : null}
      </div>

      {dataset.overdue ? (
        <p className="mb-8 rounded-card bg-warning-bg p-4 text-sm text-ink">
          {m.overdueHint}
        </p>
      ) : null}

      {dataset.status === "draft" ? (
        <section
          aria-labelledby="draft-heading"
          className="mb-8 rounded-card bg-blue-tint-95 p-5"
        >
          <h2
            id="draft-heading"
            className="mb-2 text-[1.1em] font-bold text-blue"
          >
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

      <ReminderDialog
        orgId={orgId}
        datasetId={datasetId}
        current={dataset.reminder_date}
        open={reminderOpen}
        onOpenChange={setReminderOpen}
      />

      {isOwner ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={m.deleteDialog.title}
          icon="remove"
          description={
            <>
              <p className="mb-2 font-bold">{title}</p>
              <p>{m.deleteDialog.description}</p>
            </>
          }
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

function ReminderFact({
  date,
  setBy,
}: {
  date: string | null;
  setBy: string | null;
}) {
  if (!date) return <>{m.reminder.none}</>;
  const passed = date <= todayIso();
  return (
    <>
      <time dateTime={date}>{formatIsoDate(date)}</time>
      {passed ? ` (${m.reminder.passed})` : null}
      {setBy ? (
        <span className="text-muted-foreground">
          {" "}
          {m.reminder.setBy.replace("{name}", setBy)}
        </span>
      ) : null}
    </>
  );
}
