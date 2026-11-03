import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { $api } from "../api";
import {
  ID,
  ORG,
  base,
  json,
  makeDataset,
  stubApi,
} from "../pages/datasetTestUtils";
import { datasetKeys, useDeleteDataset } from "./queries";
import { useDatasetSave } from "./useDatasetSave";

const listPath = "/api/v1/organisations/{org_id}/datasets";
const list = `/api/v1/organisations/${ORG}/datasets`;

// The cache as the catalogue and the record page leave it: the list read through `$api` and
// one dataset under its detail key.
function seededClient() {
  const queryClient = new QueryClient();
  const listKey = $api.queryOptions("get", listPath, {
    params: { path: { org_id: ORG } },
  }).queryKey;
  queryClient.setQueryData(listKey, [makeDataset()]);
  queryClient.setQueryData(datasetKeys.detail(ORG, ID), makeDataset());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, listKey, wrapper };
}

describe("dataset query keys", () => {
  it("match the catalogue's list query", () => {
    const { queryClient, listKey } = seededClient();
    const found = queryClient
      .getQueryCache()
      .findAll({ queryKey: datasetKeys.list(ORG) });
    expect(found.map((q) => q.queryKey)).toEqual([listKey]);
    expect(
      queryClient
        .getQueryCache()
        .findAll({ queryKey: datasetKeys.list("other") }),
    ).toHaveLength(0);
  });

  it.each([
    ["an update", false],
    ["a publish", true],
  ])(
    "after %s the detail holds the saved dataset and the list is stale",
    async (_, publish) => {
      const saved = makeDataset({
        version: 4,
        status: publish ? "published" : "draft",
      });
      stubApi({ [`PUT ${base}`]: () => json(saved) });
      const { queryClient, listKey, wrapper } = seededClient();
      const { result } = renderHook(
        () => useDatasetSave(ORG, { id: ID, version: 3 }),
        { wrapper },
      );
      await act(async () => {
        await result.current({ metadata: saved.metadata, publish });
      });
      expect(queryClient.getQueryData(datasetKeys.detail(ORG, ID))).toEqual(
        saved,
      );
      expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    },
  );

  it("after a create the new dataset is cached and the list is stale", async () => {
    const created = makeDataset({ id: "ds-2", status: "draft", version: 1 });
    stubApi({ [`POST ${list}`]: () => json(created, 201) });
    const { queryClient, listKey, wrapper } = seededClient();
    const { result } = renderHook(() => useDatasetSave(ORG), { wrapper });
    await act(async () => {
      await result.current({ metadata: created.metadata, publish: false });
    });
    expect(queryClient.getQueryData(datasetKeys.detail(ORG, "ds-2"))).toEqual(
      created,
    );
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });

  it("after a delete the detail is dropped and the list is stale", async () => {
    stubApi({ [`DELETE ${base}`]: () => new Response(null, { status: 204 }) });
    const { queryClient, listKey, wrapper } = seededClient();
    const { result } = renderHook(() => useDeleteDataset(ORG, ID), {
      wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(queryClient.getQueryData(datasetKeys.detail(ORG, ID))).toBe(
      undefined,
    );
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });
});
