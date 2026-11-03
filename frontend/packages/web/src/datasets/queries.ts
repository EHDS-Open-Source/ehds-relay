import type { Schemas } from "@ehds-relay/api-client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { api } from "../api";
import type { ExportFormat } from "./download";

export type Dataset = Schemas["DatasetDTO"];
export type ValidationReport = Schemas["ValidationReportDTO"];

/**
 * Query keys for datasets. The list is the one the catalogue reads through `$api`, whose keys
 * are `[method, path, init]`; this key matches it as a prefix, so invalidating it refreshes the
 * catalogue. A single dataset (and its output) lives under `["datasets", orgId, "detail", id]`.
 */
export const datasetKeys = {
  all: ["datasets"] as const,
  list: (orgId: string) =>
    [
      "get",
      "/api/v1/organisations/{org_id}/datasets",
      { params: { path: { org_id: orgId } } },
    ] as const,
  detail: (orgId: string, datasetId: string) =>
    [...datasetKeys.all, orgId, "detail", datasetId] as const,
  export: (orgId: string, datasetId: string, format: ExportFormat) =>
    [...datasetKeys.detail(orgId, datasetId), "export", format] as const,
  validation: (orgId: string, datasetId: string) =>
    [...datasetKeys.detail(orgId, datasetId), "validation"] as const,
};

/** A failed API call, keeping the HTTP status so screens can say what went wrong. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorStatus(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

// Retry network failures and server hiccups, not answers that will not change (4xx, 501)
const retryTransient = (count: number, error: unknown) => {
  const status = errorStatus(error);
  return (
    (status === undefined || (status >= 500 && status !== 501)) && count < 2
  );
};

export function useDataset(orgId: string, datasetId: string) {
  return useQuery({
    queryKey: datasetKeys.detail(orgId, datasetId),
    retry: retryTransient,
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET(
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}",
        { params: { path: { org_id: orgId, dataset_id: datasetId } }, signal },
      );
      if (!data) throw new ApiError(response.status);
      return data;
    },
  });
}

/**
 * After a create, update or publish: the saved dataset becomes the cached detail (so the
 * record and edit pages show it without loading it again), its output and check result are
 * stale, and the
 * catalogue list is refreshed.
 */
export async function refreshAfterSave(
  queryClient: QueryClient,
  orgId: string,
  dataset: Dataset,
) {
  queryClient.setQueryData(datasetKeys.detail(orgId, dataset.id), dataset);
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...datasetKeys.detail(orgId, dataset.id), "export"],
    }),
    queryClient.invalidateQueries({
      queryKey: datasetKeys.validation(orgId, dataset.id),
    }),
    queryClient.invalidateQueries({ queryKey: datasetKeys.list(orgId) }),
  ]);
}

export function useDeleteDataset(orgId: string, datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { response } = await api.DELETE(
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}",
        { params: { path: { org_id: orgId, dataset_id: datasetId } } },
      );
      if (!response.ok) throw new ApiError(response.status);
    },
    onSuccess: async () => {
      queryClient.removeQueries({
        queryKey: datasetKeys.detail(orgId, datasetId),
      });
      await queryClient.invalidateQueries({
        queryKey: datasetKeys.list(orgId),
      });
    },
  });
}

/** The dataset's output text in one format. Fetched only when `enabled`. */
export function useDatasetExport(
  orgId: string,
  datasetId: string,
  format: ExportFormat,
  enabled: boolean,
) {
  return useQuery({
    queryKey: datasetKeys.export(orgId, datasetId, format),
    enabled,
    retry: retryTransient,
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET(
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}/export",
        {
          params: {
            path: { org_id: orgId, dataset_id: datasetId },
            query: { format },
          },
          parseAs: "text",
          signal,
        },
      );
      if (!response.ok || typeof data !== "string") {
        throw new ApiError(response.status);
      }
      return data;
    },
  });
}

/**
 * The result of checking the record against the official Health DCAT-AP rules. A POST that
 * changes nothing, so it is read like a query and cached with the dataset.
 */
export function useDatasetValidation(orgId: string, datasetId: string) {
  return useQuery({
    queryKey: datasetKeys.validation(orgId, datasetId),
    retry: retryTransient,
    queryFn: async ({ signal }) => {
      const { data, response } = await api.POST(
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}/validate",
        {
          params: { path: { org_id: orgId, dataset_id: datasetId } },
          signal,
        },
      );
      if (!data) throw new ApiError(response.status);
      return data;
    },
  });
}
