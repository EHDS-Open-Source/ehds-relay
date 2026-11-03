import type { Schemas } from "@ehds-relay/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { api } from "../api";
import type { DatasetMetadata } from "./formValues";
import type { ServerIssue } from "./validate";

export type DatasetDTO = Schemas["DatasetDTO"];

/** What the form hands over when the user saves. */
export interface DatasetSaveInput {
  metadata: DatasetMetadata;
  /** True for "Save and Publish": the server publishes only if nothing is missing. */
  publish: boolean;
}

/** How a save went, for the form to report. */
export type SaveResult =
  | { kind: "saved"; dataset: DatasetDTO }
  | { kind: "invalid"; issues: ServerIssue[] }
  | { kind: "conflict" }
  | { kind: "failed" };

/** Query key of one dataset. */
export function datasetQueryKey(orgId: string, datasetId: string) {
  return ["datasets", orgId, datasetId] as const;
}

/** Query key prefix of an organisation's datasets (lists and single ones). */
export function datasetsQueryKey(orgId: string) {
  return ["datasets", orgId] as const;
}

async function request(
  orgId: string,
  dataset: Pick<DatasetDTO, "id" | "version"> | undefined,
  { metadata, publish }: DatasetSaveInput,
) {
  if (dataset) {
    return api.PUT("/api/v1/organisations/{org_id}/datasets/{dataset_id}", {
      params: { path: { org_id: orgId, dataset_id: dataset.id } },
      body: { metadata, publish, version: dataset.version },
    });
  }
  return api.POST("/api/v1/organisations/{org_id}/datasets", {
    params: { path: { org_id: orgId } },
    body: { metadata, publish },
  });
}

/**
 * Saves a dataset: creates it when there is no `dataset` yet, otherwise updates it with the
 * version that was read (a stale version is a conflict). The saved dataset is put in the
 * query cache, so the edit page shows it without loading it again.
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
          queryClient.setQueryData(datasetQueryKey(orgId, data.id), data);
          void queryClient.invalidateQueries({
            queryKey: datasetsQueryKey(orgId),
            predicate: (query) => query.queryKey[2] !== data.id,
          });
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
        return { kind: "failed" };
      } catch {
        return { kind: "failed" };
      }
    },
    [orgId, dataset, queryClient],
  );
}
