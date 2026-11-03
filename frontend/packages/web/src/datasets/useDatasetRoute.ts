import { useParams } from "@tanstack/react-router";

import { useSession } from "../session/useSession";

/** Ids from the URL of a dataset page, and whether this user is an owner of the organisation. */
export function useDatasetRoute() {
  // The edit and export routes are siblings of the detail route, so match loosely
  const { orgId = "", datasetId = "" } = useParams({ strict: false });
  const role = useSession()?.orgs.find((org) => org.id === orgId)?.role;
  return { orgId, datasetId, isOwner: role === "owner" };
}
