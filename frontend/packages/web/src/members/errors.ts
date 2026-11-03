import { shellMessages } from "../shell/messages";
import { DetailedApiError, errorStatus } from "./queries";

const m = shellMessages.members;

/** Readable text for a failed role change or removal. */
export function memberErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 403:
      return m.errors.forbidden;
    case 404:
      return m.errors.notFound;
    case 409:
      return m.errors.lastOwner;
    default:
      return m.errors.failed;
  }
}

/** Readable text for a failed invite, resend or cancel. */
export function invitationErrorMessage(error: unknown): string {
  const text = m.invitations.errors;
  switch (errorStatus(error)) {
    case 403:
      return text.forbidden;
    case 409: {
      const detail = error instanceof DetailedApiError ? error.detail : "";
      if (detail.includes("already a member")) return text.alreadyMember;
      if (detail.includes("already invited")) return text.alreadyInvited;
      return text.notPending;
    }
    case 422:
      return text.invalid;
    default:
      return text.failed;
  }
}
