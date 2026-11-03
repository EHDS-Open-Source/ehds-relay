import { useMutation } from "@tanstack/react-query";

import { api } from "../api";
import { ApiError } from "../datasets/queries";
import { useSessionStore } from "../session/useSession";
import { shellMessages } from "../shell/messages";

export { errorStatus } from "../datasets/queries";

/** Readable text for a failed organisation update. */
export function updateOrganisationError(status: number | undefined): string {
  const text = shellMessages.settings.errors;
  switch (status) {
    case 403:
      return text.forbidden;
    case 404:
      return text.notFound;
    case 422:
      return text.invalid;
    default:
      return text.failed;
  }
}

/** Saves the organisation's name and country, then reloads the session so every screen shows them. */
export function useUpdateOrganisation(orgId: string) {
  const store = useSessionStore();
  return useMutation({
    mutationFn: async (body: { name: string; country: string }) => {
      const { data, response } = await api.PATCH(
        "/api/v1/organisations/{org_id}",
        { params: { path: { org_id: orgId } }, body },
      );
      if (!data) throw new ApiError(response.status);
      await store.refresh();
      return data;
    },
  });
}
