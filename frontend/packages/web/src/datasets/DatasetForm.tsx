import { SectionNav, cn } from "@ehds-relay/ui";
import { useState } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";

import { shellMessages } from "../shell/messages";
import { datasetSections, fieldKeys, sectionAnchorId } from "./fields";
import { inputId } from "./fields/formState";
import {
  fromMetadata,
  mapToMetadata,
  type DatasetFormValues,
} from "./formValues";
import { focusField } from "./focus";
import { MissingList } from "./MissingList";
import { SaveMenu } from "./SaveMenu";
import { AccessSection } from "./sections/AccessSection";
import { CoverageSection } from "./sections/CoverageSection";
import { MainSection } from "./sections/MainSection";
import { OrganisationsSection } from "./sections/OrganisationsSection";
import { QuantumSection } from "./sections/QuantumSection";
import { TechnicalSection } from "./sections/TechnicalSection";
import type { DatasetSaveInput, SaveResult } from "./useDatasetSave";
import {
  serverIssues,
  toFieldErrors,
  validateForSave,
  type FormIssue,
} from "./validate";

const text = shellMessages.datasetForm;

/** What the form shows above its sections after a save. */
export type SaveFeedback =
  | { type: "saving" }
  | { type: "draft" }
  | { type: "published" }
  | { type: "incomplete"; missing: readonly string[] }
  | { type: "error"; message: string };

export interface DatasetFormProps {
  /** Values to start from; `fromMetadata(dataset.metadata)` when editing. Empty by default. */
  initialValues?: DatasetFormValues;
  /**
   * Saves the dataset. The form has already checked the answers; it reports the result
   * (draft saved, missing fields, server errors on their fields, conflict). The caller
   * decides where to go next.
   */
  onSubmit: (input: DatasetSaveInput) => Promise<SaveResult>;
  /** Feedback to show on arrival, e.g. after the first save moved to the edit page. */
  initialFeedback?: SaveFeedback;
}

const resolver: Resolver<DatasetFormValues> = (values) => {
  const result = validateForSave(values);
  return result.ok
    ? { values, errors: {} }
    : { values: {}, errors: toFieldErrors(result.issues) };
};

/** Form order of an issue, so the first one on the page gets focus. */
function order(issue: FormIssue): number {
  const index = fieldKeys.indexOf(
    issue.path.split(".")[0] as (typeof fieldKeys)[number],
  );
  return index === -1 ? fieldKeys.length : index;
}

function focusIssue(issues: readonly FormIssue[]): void {
  const first = [...issues]
    .filter((i) => i.path)
    .sort((a, b) => order(a) - order(b))[0];
  if (!first) return;
  const input = document.getElementById(inputId(first.path));
  if (input) {
    input.scrollIntoView?.({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  } else {
    focusField(first.path.split(".")[0]!);
  }
}

/**
 * The guided dataset form, used to add and to edit a dataset. Its fields have anchors
 * `#field-<key>` (see `fieldAnchorId`) and its sections `#section-<id>`.
 */
export function DatasetForm({
  initialValues,
  onSubmit,
  initialFeedback,
}: DatasetFormProps) {
  const form = useForm<DatasetFormValues>({
    defaultValues: initialValues ?? fromMetadata(),
    resolver,
    shouldFocusError: false,
  });
  const [feedback, setFeedback] = useState<SaveFeedback | undefined>(
    initialFeedback,
  );

  async function save(values: DatasetFormValues, publish: boolean) {
    const { metadata, indexMap } = mapToMetadata(values);
    setFeedback({ type: "saving" });
    const result = await onSubmit({ metadata, publish });
    switch (result.kind) {
      case "saved": {
        const { status, missing_for_publish: missing } = result.dataset;
        if (status === "published") setFeedback({ type: "published" });
        else if (publish) setFeedback({ type: "incomplete", missing });
        else setFeedback({ type: "draft" });
        break;
      }
      case "invalid": {
        const issues = serverIssues(result.issues, indexMap);
        for (const issue of issues) {
          if (issue.path) {
            form.setError(issue.path as keyof DatasetFormValues, {
              type: "server",
              message: issue.message,
            });
          }
        }
        setFeedback({ type: "error", message: text.status.fixErrors });
        focusIssue(issues);
        break;
      }
      case "conflict":
        setFeedback({ type: "error", message: text.status.conflict });
        break;
      case "failed":
        setFeedback({ type: "error", message: text.status.failed });
        break;
    }
  }

  function onInvalid() {
    const result = validateForSave(form.getValues());
    if (result.ok) return;
    const titleOnly = result.issues.some(
      (i) => i.message === text.status.titleRequired,
    );
    setFeedback({
      type: "error",
      message: titleOnly ? text.status.titleRequired : text.status.fixErrors,
    });
    focusIssue(result.issues);
  }

  function onSave(publish: boolean) {
    void form.handleSubmit((values) => save(values, publish), onInvalid)();
  }

  function onClear() {
    form.reset(fromMetadata());
    setFeedback(undefined);
  }

  function isEmpty(): boolean {
    return JSON.stringify(form.getValues()) === JSON.stringify(fromMetadata());
  }

  const datasetTitle = useWatch({ control: form.control, name: "title" })
    ?.find((t) => t.text.trim())
    ?.text.trim();
  const busy = feedback?.type === "saving";
  return (
    <FormProvider {...form}>
      <div className="flex flex-col md:flex-row">
        {/* Contents on phones, so the menu strip sticks to the top of the whole form */}
        <aside className="contents md:block md:w-[260px] md:shrink-0">
          <SectionNav
            label={text.sectionNavLabel}
            sections={datasetSections.map((s) => ({
              id: sectionAnchorId(s.id),
              label: s.title,
            }))}
          />
        </aside>
        <form
          noValidate
          aria-label={text.formLabel}
          className="flex min-w-0 flex-1 flex-col gap-12 py-6 md:px-16 md:py-14"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-4">
            <SaveMenu
              busy={busy}
              onSave={onSave}
              onClear={onClear}
              isEmpty={isEmpty}
              datasetTitle={datasetTitle}
            />
            <p
              role="status"
              className={cn(
                "min-h-5 text-[0.95em] font-semibold",
                feedback?.type === "error" ? "text-destructive" : "text-ink",
              )}
            >
              {feedbackText(feedback)}
            </p>
            {feedback?.type === "incomplete" ? (
              <MissingList missing={feedback.missing} />
            ) : null}
          </div>
          <MainSection />
          <AccessSection />
          <CoverageSection />
          <OrganisationsSection />
          <TechnicalSection />
          <QuantumSection />
        </form>
      </div>
    </FormProvider>
  );
}

function feedbackText(feedback: SaveFeedback | undefined): string {
  switch (feedback?.type) {
    case "saving":
      return text.status.saving;
    case "draft":
    case "incomplete":
      return text.status.savedDraft;
    case "published":
      return text.status.published;
    case "error":
      return feedback.message;
    default:
      return "";
  }
}
