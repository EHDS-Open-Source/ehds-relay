import { useParams } from "@tanstack/react-router";

import { useSession } from "../session/useSession";

/** Name of the organisation in the URL, for page eyebrows. */
export function useOrgName(): string | undefined {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  return useSession()?.orgs.find((org) => org.id === orgId)?.name;
}
