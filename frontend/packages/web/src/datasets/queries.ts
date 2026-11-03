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

/** Query keys for datasets. Other pages (such as the catalogue) use these to refresh lists. */
export const datasetKeys = {
  all: ["datasets"] as const,
  lists: (orgId: string) => [...datasetKeys.all, orgId, "list"] as const,
  detail: (orgId: string, datasetId: string) =>
    [...datasetKeys.all, orgId, "detail", datasetId] as const,
  export: (orgId: string, datasetId: string, format: ExportFormat) =>
    [...datasetKeys.detail(orgId, datasetId), "export", format] as const,
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

export interface SaveDatasetInput {
  metadata: Schemas["DatasetMetadata"];
  publish: boolean;
  /** The version that was read; the server refuses a stale one with 409. */
  version: number;
}

function refreshLists(queryClient: QueryClient, orgId: string) {
  return queryClient.invalidateQueries({ queryKey: datasetKeys.lists(orgId) });
}

export function useUpdateDataset(orgId: string, datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveDatasetInput) => {
      const { data, response } = await api.PUT(
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}",
        {
          params: { path: { org_id: orgId, dataset_id: datasetId } },
          body: input,
        },
      );
      if (!data) throw new ApiError(response.status);
      return data;
    },
    onSuccess: async (dataset) => {
      queryClient.setQueryData(datasetKeys.detail(orgId, datasetId), dataset);
      // The exported text is out of date now
      await queryClient.invalidateQueries({
        queryKey: [...datasetKeys.detail(orgId, datasetId), "export"],
      });
      await refreshLists(queryClient, orgId);
    },
  });
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
      await refreshLists(queryClient, orgId);
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
