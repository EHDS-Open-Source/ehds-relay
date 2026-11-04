import {
  Button,
  DetailPill,
  EmptyState,
  Icon,
  LoadingStar,
  PageHeader,
  Ribbon,
  ConfirmDialog,
  type IconName,
  buttonVariants,
  cn,
  datasetStarColour,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DatasetRecord } from "../datasets/DatasetRecord";
import { MissingFields } from "../datasets/MissingFields";
import { ReminderDialog } from "../datasets/ReminderDialog";
import { formatIsoDate, isReminderPassed } from "../datasets/reminderDates";
import {
  errorStatus,
  useDataset,
  useDeleteDataset,
  type Dataset,
} from "../datasets/queries";
import { useDatasetRoute } from "../datasets/useDatasetRoute";
import { RibbonPortal } from "../shell/RibbonSlot";
import { shellMessages } from "../shell/messages";

const m = shellMessages.datasets;

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** A timestamp for people, with the month written out, e.g. "4 November 2026 at 09:39". */
function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

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
  const loading = useMinimumPending(query.isPending);

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

  if (loading || query.isPending) {
    return <LoadingStar size="page" message={m.loadingRecord} />;
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
  // Strictly before today: the due day itself is not overdue yet.
  const reminderPassed = isReminderPassed(reminderDate);
  const overdue = reminderPassed || dataset.overdue;
  const openReminder = () => setReminderOpen(true);

  const pills = recordPills(metadata);
  const published = dataset.status === "published";

  return (
    <div className="-mt-4 md:-mt-2">
      {overdue ? (
        <RibbonPortal>
          <Ribbon
            tone="overdue"
            label={
              reminderPassed && reminderDate
                ? m.ribbon.overdueSince
                : m.ribbon.overdue
            }
            detail={reminderPassed ? m.ribbon.overdueDetail : m.overdueHint}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-blue bg-transparent text-blue hover:border-blue hover:bg-blue hover:text-yellow"
                onClick={openReminder}
              >
                {m.ribbon.setNext}
              </Button>
            }
          >
            {reminderPassed && reminderDate
              ? formatIsoDate(reminderDate)
              : null}
          </Ribbon>
        </RibbonPortal>
      ) : reminderDate ? (
        <RibbonPortal>
          <Ribbon label={m.ribbon.due}>{formatIsoDate(reminderDate)}</Ribbon>
        </RibbonPortal>
      ) : null}

      <PageHeader
        variant="record"
        className="mb-12 md:mb-20"
        eyebrow={m.context}
        title={title}
        titleAdornment={
          <Icon
            name="star"
            style={{
              width: "0.66em",
              height: "0.66em",
              color: datasetStarColour(datasetId),
            }}
          />
        }
        description={dataset.description ?? undefined}
        actions={
          <div className="flex flex-col items-end gap-3 max-md:w-full max-md:items-stretch">
            <div className="flex gap-3 max-md:flex-col">
              <Button
                type="button"
                size="record"
                className="gap-6 pr-3 pl-6 max-md:justify-between"
                onClick={openReminder}
              >
                {reminderDate ? m.reminder.update : m.reminder.button}
                <span className="flex w-10 justify-center">
                  <Icon
                    name={reminderDate ? "calendarUpdate" : "calendar"}
                    size="lg"
                  />
                </span>
              </Button>
              <Link
                to="/orgs/$orgId/datasets/$datasetId/edit"
                params={{ orgId, datasetId }}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "record" }),
                  "gap-4 px-5 max-md:w-full",
                )}
              >
                {m.edit}
                <Icon name="edit" style={{ width: 18, height: 18 }} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/orgs/$orgId/datasets/$datasetId/export"
                params={{ orgId, datasetId }}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                {m.viewOutput}
                <Icon name="next" size="sm" />
              </Link>
              {isOwner ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    remove.reset();
                    setConfirming(true);
                  }}
                >
                  {m.delete}
                  <Icon name="bin" size="sm" />
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        {pills.length > 0 ? (
          <ul
            data-slot="detail-pills"
            aria-label={m.record.factsLabel}
            className="mt-6 flex flex-wrap gap-2 md:gap-3"
          >
            {pills.map((pill) => (
              <li key={pill.key} className="flex max-w-full">
                <DetailPill icon={pill.icon}>
                  {pill.srLabel ? (
                    <span className="sr-only">{pill.srLabel} </span>
                  ) : null}
                  {pill.text}
                </DetailPill>
              </li>
            ))}
          </ul>
        ) : null}
        <p
          data-slot="record-meta"
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.85em] text-ink-3"
        >
          <span
            data-status={dataset.status}
            className="inline-flex items-center gap-1.5 font-semibold text-ink"
          >
            <Icon
              name={published ? "tick" : "edit"}
              size="xs"
              className={published ? "text-success-on-white" : "text-blue"}
            />
            {published ? m.record.status.published : m.record.status.draft}
          </span>
          <span>
            {m.record.lastChanged(formatDateTime(dataset.updated_at))}
          </span>
          {dataset.last_validated_at ? (
            <span>
              {m.record.lastValidated(
                formatDateTime(dataset.last_validated_at),
              )}
            </span>
          ) : null}
          {reminderDate && dataset.reminder_set_by_name ? (
            <span>{m.record.reminderSetBy(dataset.reminder_set_by_name)}</span>
          ) : null}
        </p>
      </PageHeader>

      {dataset.status === "draft" ? (
        <section
          aria-labelledby="draft-heading"
          className="mb-12 max-w-[1280px] rounded-card bg-blue-tint-95 p-5"
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
        datasetTitle={title}
        current={dataset.reminder_date}
        open={reminderOpen}
        onOpenChange={setReminderOpen}
      />

      {isOwner ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={m.deleteDialog.title(title)}
          icon="bin"
          description={
            <>
              <strong className="font-bold">{title}</strong>{" "}
              {m.deleteDialog.description}{" "}
              <strong className="font-bold">
                {m.deleteDialog.irreversible}
              </strong>
            </>
          }
          confirmLabel={m.deleteDialog.confirm}
          destructive
          pending={remove.isPending}
          error={remove.isError ? deleteErrorMessage(remove.error) : undefined}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

interface Pill {
  key: string;
  icon: IconName;
  text: string;
  /** Read before the text, for pills whose icon alone says what the value is. */
  srLabel?: string;
}

const counts = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});

/** The facts under the title: access level, category, geography and how much data. */
function recordPills(metadata: Dataset["metadata"]): Pill[] {
  const pills: Pill[] = [];
  const labels = (terms: { label: string }[] | null | undefined) =>
    (terms ?? []).map((t) => t.label).join(", ");
  if (metadata.access_rights) {
    pills.push({
      key: "access",
      icon: "eye",
      text: m.accessRights[metadata.access_rights],
      srLabel: m.record.pillLabels.access,
    });
  }
  const category = labels(metadata.health_category);
  if (category) {
    pills.push({
      key: "category",
      icon: "tag",
      text: category,
      srLabel: m.record.pillLabels.category,
    });
  }
  const geography = labels(metadata.geographical_coverage);
  if (geography) {
    pills.push({
      key: "geography",
      icon: "pin",
      text: geography,
      srLabel: m.record.pillLabels.geography,
    });
  }
  if (typeof metadata.number_of_records === "number") {
    pills.push({
      key: "records",
      icon: "file",
      text: m.record.records(counts.format(metadata.number_of_records)),
    });
  }
  if (typeof metadata.number_of_unique_individuals === "number") {
    pills.push({
      key: "people",
      icon: "person",
      text: m.record.people(
        counts.format(metadata.number_of_unique_individuals),
      ),
    });
  }
  return pills;
}
