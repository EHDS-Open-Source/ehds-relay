import type { Schemas } from "@ehds-relay/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { api } from "../api";
import type { DatasetMetadata } from "./formValues";
import { refreshAfterSave } from "./queries";
import type { ServerIssue } from "./validate";

export type DatasetDTO = Schemas["DatasetDTO"];

/** What the form hands over when the user saves. */
export interface DatasetSaveInput {
  metadata: DatasetMetadata;
  /**
   * True for "Save and Publish": the server publishes only if nothing is missing. False
   * saves a draft, or keeps a published dataset published when it is still complete.
   */
  publish: boolean;
  /** Save as a draft and take a published dataset out of the catalogue (updates only). */
  unpublish?: boolean;
}

/** How a save went, for the form to report. */
export type SaveResult =
  | { kind: "saved"; dataset: DatasetDTO }
  | { kind: "invalid"; issues: ServerIssue[] }
  | { kind: "conflict" }
  /** Any other failure; `status` is the HTTP status when there was a response. */
  | { kind: "failed"; status?: number };

async function request(
  orgId: string,
  dataset: Pick<DatasetDTO, "id" | "version"> | undefined,
  { metadata, publish, unpublish }: DatasetSaveInput,
) {
  if (dataset) {
    return api.PUT("/api/v1/organisations/{org_id}/datasets/{dataset_id}", {
      params: { path: { org_id: orgId, dataset_id: dataset.id } },
      body: {
        metadata,
        publish,
        version: dataset.version,
        unpublish: unpublish ?? false,
      },
    });
  }
  return api.POST("/api/v1/organisations/{org_id}/datasets", {
    params: { path: { org_id: orgId } },
    body: { metadata, publish },
  });
}

/**
 * Saves a dataset: creates it when there is no `dataset` yet, otherwise updates it with the
 * version that was read (a stale version is a conflict). This is the one save path for the
 * add and edit pages; see `refreshAfterSave` for what it updates in the query cache.
 */
export function useDatasetSave(
  orgId: string,
  dataset?: Pick<DatasetDTO, "id" | "version">,
) {
  const queryClient = useQueryClient();
  return useCallback(
    async (input: DatasetSaveInput): Promise<SaveResult> => {
      try {
        const { data, error, response } = await request(orgId, dataset, input);
        if (data) {
          await refreshAfterSave(queryClient, orgId, data);
          return { kind: "saved", dataset: data };
        }
        if (response.status === 409) return { kind: "conflict" };
        if (response.status === 422) {
          const detail = (error as { detail?: unknown } | undefined)?.detail;
          return {
            kind: "invalid",
            issues: Array.isArray(detail) ? (detail as ServerIssue[]) : [],
          };
        }
        return { kind: "failed", status: response.status };
      } catch {
        return { kind: "failed" };
      }
    },
    [orgId, dataset, queryClient],
  );
}
