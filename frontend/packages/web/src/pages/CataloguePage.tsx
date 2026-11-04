import {
  Button,
  CardGrid,
  DatasetCard,
  EmptyState,
  FilterChips,
  FilterToggle,
  Icon,
  LoadingStar,
  PageHeader,
  SearchField,
  datasetStarColour,
} from "@ehds-relay/ui";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import { $api } from "../api";
import { formatIsoDate } from "../datasets/reminderDates";
import { shellMessages } from "../shell/messages";
import { cardOpened, takeLastOpenedCard } from "./catalogue/cardFocus";
import {
  accessFilters,
  filterDatasets,
  readCatalogueFields,
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
  const searchRef = useRef<HTMLInputElement>(null);
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
    () =>
      Array.isArray(list.data)
        ? list.data.map((d) => readCatalogueFields(d))
        : [],
    [list.data],
  );
  const anyOverdue = cards.some((d) => d.overdue);
  const visible = useMemo(
    () => filterDatasets(cards, deferredQuery, access, revalidation),
    [cards, deferredQuery, access, revalidation],
  );

  // Coming back from a record: put focus back on the card that was opened.
  const gridRef = useRef<HTMLUListElement>(null);
  const hasCards = visible.length > 0;
  useEffect(() => {
    if (!hasCards) return;
    const id = takeLastOpenedCard();
    if (!id) return;
    const card = gridRef.current?.querySelector<HTMLElement>(
      `a[data-dataset-id="${CSS.escape(id)}"]`,
    );
    card?.focus();
  }, [hasCards]);

  const onCardClick = (id: string) => (event: MouseEvent<HTMLElement>) => {
    // Only when the link opens here, not in a new tab or window.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    cardOpened(id, event.currentTarget);
  };

  // Label first, then the blue circle with the yellow plus; the circle inverts on hover.
  const addButton = (
    <Button
      asChild
      size="lg"
      className="group gap-6 pr-2 pl-6 max-md:w-full max-md:justify-between"
    >
      <Link to="/orgs/$orgId/datasets/new" params={{ orgId }}>
        {text.addDataset}
        <span
          aria-hidden="true"
          className="flex size-[34px] items-center justify-center rounded-full bg-blue text-yellow transition-colors group-hover:bg-yellow group-hover:text-blue"
        >
          <Icon name="plus" style={{ width: 18, height: 18 }} />
        </span>
      </Link>
    </Button>
  );

  let body;
  if (list.isPending) {
    body = <LoadingStar size="page" message={text.loading} />;
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
      <>
        <div
          data-catalogue-toolbar=""
          className="mb-10 flex flex-wrap items-center gap-3"
        >
          <SearchField
            ref={searchRef}
            value={typed}
            onChange={(value) => {
              setTyped(value);
              setSearch({ q: value });
            }}
            label={text.searchLabel}
            placeholder={text.searchPlaceholder}
            className="max-w-[360px] flex-1 max-md:max-w-none max-md:basis-full"
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
          {anyOverdue || overdue ? (
            <FilterToggle
              label={text.overdueFilter}
              pressed={overdue}
              onChange={(pressed) => setSearch({ overdue: pressed })}
            />
          ) : null}
        </div>
        {visible.length === 0 ? (
          <EmptyState
            status
            title={text.noMatch.title(
              deferredQuery,
              access === "all" ? undefined : text.accessInSentence[access],
            )}
            description={
              deferredQuery.trim()
                ? text.noMatch.description
                : text.noMatch.filterDescription
            }
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setTyped("");
                  setSearch({ q: "", access: "all", overdue: false });
                  searchRef.current?.focus();
                }}
              >
                {text.noMatch.clear}
              </Button>
            }
          />
        ) : (
          <CardGrid ref={gridRef}>
            {visible.map((d) => (
              <DatasetCard
                key={d.id}
                title={d.title || text.untitled}
                description={d.description}
                draft={d.draft}
                overdue={d.overdue}
                starColour={datasetStarColour(d.id)}
                // An overdue card shows the date only when that date is what passed.
                reminderDate={
                  d.reminderDate && (d.reminderPassed || !d.overdue)
                    ? formatIsoDate(d.reminderDate)
                    : undefined
                }
                reminderLabel={text.reminderDue}
                draftLabel={text.draft}
                overdueLabel={text.overdue}
                overdueSinceLabel={text.overdueSince}
                renderLink={({ className, children }) => (
                  <Link
                    to="/orgs/$orgId/datasets/$datasetId"
                    params={{ orgId, datasetId: d.id }}
                    className={className}
                    data-dataset-id={d.id}
                    onClick={onCardClick(d.id)}
                  >
                    {children}
                  </Link>
                )}
              />
            ))}
          </CardGrid>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={shellMessages.pages.catalogue.title}
        actions={cards.length > 0 ? addButton : undefined}
        className="mb-8 gap-10 max-md:flex-col max-md:items-stretch max-md:gap-8 md:items-center"
      />
      {body}
    </>
  );
}
