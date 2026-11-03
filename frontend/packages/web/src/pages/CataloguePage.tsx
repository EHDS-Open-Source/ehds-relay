import {
  Button,
  CardGrid,
  DatasetCard,
  EmptyState,
  FilterChips,
  PageHeader,
  SearchField,
} from "@ehds-relay/ui";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";

import { $api } from "../api";
import { shellMessages } from "../shell/messages";
import {
  accessFilters,
  filterDatasets,
  readCatalogueFields,
  revalidationFilters,
  type AccessFilter,
  type RevalidationFilter,
} from "./catalogue/filterDatasets";
import { useOrgName } from "./useOrgName";

const route = getRouteApi("/orgs/$orgId/catalogue");
const text = shellMessages.catalogue;

export function CataloguePage() {
  const orgName = useOrgName();
  const { orgId } = route.useParams();
  const { q = "", access = "all", overdue = false } = route.useSearch();
  const revalidation: RevalidationFilter = overdue ? "overdue" : "any";
  const navigate = useNavigate({ from: route.id });

  // Typing is kept locally so the cursor never waits on the router; the URL follows.
  const [typed, setTyped] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    // The URL changed from outside (back button, clear): show it.
    setSeenQ(q);
    setTyped(q);
  }
  const deferredQuery = useDeferredValue(typed);

  const setSearch = (next: {
    q?: string;
    access?: AccessFilter;
    overdue?: boolean;
  }) =>
    void navigate({
      replace: true,
      search: (prev) => {
        const merged = { ...prev, ...next };
        return {
          q: merged.q ? merged.q : undefined,
          access: merged.access === "all" ? undefined : merged.access,
          overdue: merged.overdue ? (true as const) : undefined,
        };
      },
    });

  const list = $api.useQuery("get", "/api/v1/organisations/{org_id}/datasets", {
    params: { path: { org_id: orgId } },
  });

  const cards = useMemo(
    () => (Array.isArray(list.data) ? list.data.map(readCatalogueFields) : []),
    [list.data],
  );
  const visible = useMemo(
    () => filterDatasets(cards, deferredQuery, access, revalidation),
    [cards, deferredQuery, access, revalidation],
  );

  const addButton = (
    <Button asChild>
      <Link to="/orgs/$orgId/datasets/new" params={{ orgId }}>
        {text.addDataset}
      </Link>
    </Button>
  );

  let body;
  if (list.isPending) {
    body = <p role="status">{text.loading}</p>;
  } else if (list.isError) {
    body = (
      <div role="alert" className="flex items-center gap-4">
        <p>{text.error}</p>
        <Button variant="outline" onClick={() => void list.refetch()}>
          {text.retry}
        </Button>
      </div>
    );
  } else if (cards.length === 0) {
    body = (
      <EmptyState
        title={text.empty.title}
        description={text.empty.description}
        action={addButton}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-6">
        <SearchField
          value={typed}
          onChange={(value) => {
            setTyped(value);
            setSearch({ q: value });
          }}
          label={text.searchLabel}
          placeholder={text.searchPlaceholder}
        />
        <FilterChips
          label={text.filterLabel}
          value={access}
          onChange={(value) => setSearch({ access: value })}
          options={accessFilters.map((value) => ({
            value,
            label: text.access[value],
          }))}
        />
        <FilterChips
          label={text.revalidationLabel}
          value={revalidation}
          onChange={(value) => setSearch({ overdue: value === "overdue" })}
          options={revalidationFilters.map((value) => ({
            value,
            label: text.revalidation[value],
          }))}
        />
        {visible.length === 0 ? (
          <EmptyState
            title={text.noMatch.title}
            description={text.noMatch.description}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setTyped("");
                  setSearch({ q: "", access: "all", overdue: false });
                }}
              >
                {text.noMatch.clear}
              </Button>
            }
          />
        ) : (
          <CardGrid>
            {visible.map((d) => (
              <DatasetCard
                key={d.id}
                title={d.title || text.untitled}
                description={d.description}
                draft={d.draft}
                overdue={d.overdue}
                draftLabel={text.draft}
                overdueLabel={text.overdue}
                renderLink={({ className, children }) => (
                  <Link
                    to="/orgs/$orgId/datasets/$datasetId"
                    params={{ orgId, datasetId: d.id }}
                    className={className}
                  >
                    {children}
                  </Link>
                )}
              />
            ))}
          </CardGrid>
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={shellMessages.pages.catalogue.title}
        description={shellMessages.pages.catalogue.description}
        actions={cards.length > 0 ? addButton : undefined}
      />
      {body}
    </>
  );
}
