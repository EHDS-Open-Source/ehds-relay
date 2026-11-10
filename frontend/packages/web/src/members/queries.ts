import type { Schemas } from "@ehds-relay/api-client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { api } from "../api";
import { ApiError } from "../datasets/queries";
import { useSessionStore } from "../session/useSession";

export type Member = Schemas["MemberDTO"];
export type Invitation = Schemas["InvitationDTO"];
export type InvitationPreview = Schemas["InvitationPreviewDTO"];
export type InvitationStatus = Schemas["InvitationStatus"];
export type MemberRole = Schemas["MemberRole"];

export { ApiError, errorStatus } from "../datasets/queries";

/** A failed call that also keeps the server's reason, to tell apart answers sharing a status. */
export class DetailedApiError extends ApiError {
  readonly detail: string;
  /** For a 422: which body fields the server rejected (the last part of each `loc`). */
  readonly fields: readonly string[];
  constructor(status: number, detail: string, fields: readonly string[] = []) {
    super(status);
    this.detail = detail;
    this.fields = fields;
  }
}

function fieldsOf(body: unknown): string[] {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (!Array.isArray(detail)) return [];
  return detail.flatMap((item: unknown) => {
    const loc = (item as { loc?: unknown } | null)?.loc;
    const last = Array.isArray(loc)
      ? (loc[loc.length - 1] as unknown)
      : undefined;
    return typeof last === "string" ? [last] : [];
  });
}

function detailOf(body: unknown): string {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  return typeof detail === "string" ? detail : "";
}

export function failure(response: Response, body: unknown): ApiError {
  return new DetailedApiError(response.status, detailOf(body), fieldsOf(body));
}

/** Query keys for one organisation's members and invitations. */
export const memberKeys = {
  members: (orgId: string) => ["members", orgId] as const,
  invitations: (orgId: string) => ["invitations", orgId] as const,
  invitationList: (orgId: string, status: InvitationStatus | undefined) =>
    [...memberKeys.invitations(orgId), status ?? "all"] as const,
};

const retryTransient = (count: number, error: unknown) => {
  const status = error instanceof ApiError ? error.status : undefined;
  return (
    (status === undefined || (status >= 500 && status !== 501)) && count < 2
  );
};

export function useMembers(orgId: string, enabled = true) {
  return useQuery({
    queryKey: memberKeys.members(orgId),
    enabled,
    retry: retryTransient,
    queryFn: async ({ signal }) => {
      const { data, response, error } = await api.GET(
        "/api/v1/organisations/{org_id}/members",
        { params: { path: { org_id: orgId } }, signal },
      );
      if (!data) throw failure(response, error);
      return data;
    },
  });
}

export function useInvitations(
  orgId: string,
  status: InvitationStatus | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: memberKeys.invitationList(orgId, status),
    enabled,
    retry: retryTransient,
    queryFn: async ({ signal }) => {
      const { data, response, error } = await api.GET(
        "/api/v1/organisations/{org_id}/invitations",
        {
          params: {
            path: { org_id: orgId },
            ...(status && { query: { status } }),
          },
          signal,
        },
      );
      if (!data) throw failure(response, error);
      return data;
    },
  });
}

const refreshMembers = (queryClient: QueryClient, orgId: string) =>
  queryClient.invalidateQueries({ queryKey: memberKeys.members(orgId) });
const refreshInvitations = (queryClient: QueryClient, orgId: string) =>
  queryClient.invalidateQueries({ queryKey: memberKeys.invitations(orgId) });

export function useChangeRole(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; role: MemberRole }) => {
      const { data, response, error } = await api.PATCH(
        "/api/v1/organisations/{org_id}/members/{user_id}",
        {
          params: { path: { org_id: orgId, user_id: input.userId } },
          body: { role: input.role },
        },
      );
      if (!data) throw failure(response, error);
      return data;
    },
    // Refresh on failure too: the list may be stale, which is often why it failed
    onSettled: () => refreshMembers(queryClient, orgId),
  });
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { response, error } = await api.DELETE(
        "/api/v1/organisations/{org_id}/members/{user_id}",
        { params: { path: { org_id: orgId, user_id: userId } } },
      );
      if (!response.ok) throw failure(response, error);
    },
    onSettled: () => refreshMembers(queryClient, orgId),
  });
}

export function useInvite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Schemas["InvitationCreateDTO"]) => {
      const { data, response, error } = await api.POST(
        "/api/v1/organisations/{org_id}/invitations",
        { params: { path: { org_id: orgId } }, body: input },
      );
      if (!data) throw failure(response, error);
      return data;
    },
    onSettled: () => refreshInvitations(queryClient, orgId),
  });
}

export function useCancelInvitation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { response, error } = await api.DELETE(
        "/api/v1/organisations/{org_id}/invitations/{invitation_id}",
        {
          params: { path: { org_id: orgId, invitation_id: invitationId } },
        },
      );
      if (!response.ok) throw failure(response, error);
    },
    onSettled: () => refreshInvitations(queryClient, orgId),
  });
}

export function useResendInvitation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, response, error } = await api.POST(
        "/api/v1/organisations/{org_id}/invitations/{invitation_id}/resend",
        {
          params: { path: { org_id: orgId, invitation_id: invitationId } },
        },
      );
      if (!data) throw failure(response, error);
      return data;
    },
    onSettled: () => refreshInvitations(queryClient, orgId),
  });
}

/** The public preview of an invitation link. */
export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ["invitation-preview", token],
    retry: retryTransient,
    queryFn: async ({ signal }) => {
      const { data, response, error } = await api.GET(
        "/api/v1/invitations/{token}",
        { params: { path: { token } }, signal },
      );
      if (!data) throw failure(response, error);
      return data;
    },
  });
}

/** Accepts the invitation as the signed-in user, then reloads their organisations. */
export function useAcceptInvitation(token: string) {
  const store = useSessionStore();
  return useMutation({
    mutationFn: async () => {
      const { data, response, error } = await api.POST(
        "/api/v1/invitations/{token}/accept",
        { params: { path: { token } } },
      );
      if (!data) throw failure(response, error);
      // The new organisation must be in the session before its pages open
      await store.refresh();
      return data;
    },
  });
}
