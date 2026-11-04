import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makePreview, renderAs } from "../members/testUtils";
import { demoSession, makeOrg } from "../session/testing";
import { shellMessages } from "../shell/messages";
import { json, stubApi } from "./datasetTestUtils";

const m = shellMessages.acceptInvite;
const path = "/invitations/tok%2F1";
const previewUrl = "/api/v1/invitations/tok%2F1";
const acceptUrl = `${previewUrl}/accept`;

const invitee = {
  ...demoSession,
  user: { ...demoSession.user, email: "invitee@example.org" },
};

describe("accept invitation page", () => {
  it("signed out: shows the invitation and links to sign in and sign up", async () => {
    stubApi({ [`GET ${previewUrl}`]: () => json(makePreview()) });
    renderAs(path, null);
    expect(
      await screen.findByRole("heading", { name: m.title("Acme Hospital") }),
    ).toBeVisible();
    expect(screen.getByText(/Ada Owner invited you as Standard/)).toBeVisible();
    expect(
      screen.getByText(new RegExp(m.forAddress("invitee@example.org"))),
    ).toBeVisible();
    const redirect = encodeURIComponent("/invitations/tok%2F1");
    expect(screen.getByRole("link", { name: m.signIn })).toHaveAttribute(
      "href",
      `/api/v1/auth/login?redirect=${redirect}`,
    );
    expect(screen.getByRole("link", { name: m.createAccount })).toHaveAttribute(
      "href",
      `/api/v1/auth/login?redirect=${redirect}&signup=true`,
    );
    expect(
      screen.queryByRole("button", { name: m.accept }),
    ).not.toBeInTheDocument();
  });

  it("signed in: accepts, then opens the organisation's catalogue", async () => {
    const calls = stubApi({
      [`GET ${previewUrl}`]: () => json(makePreview()),
      [`POST ${acceptUrl}`]: () =>
        json(makeOrg({ id: "acme", name: "Acme Hospital", role: "standard" })),
      "GET /api/v1/me": () => json(invitee.user),
      "GET /api/v1/organisations": () => json([]),
    });
    const router = renderAs(path, invitee);
    await userEvent.click(
      await screen.findByRole("button", { name: m.accept }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/orgs/acme/catalogue");
    });
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("says which address was invited when the account is wrong (403)", async () => {
    stubApi({
      [`GET ${previewUrl}`]: () => json(makePreview()),
      [`POST ${acceptUrl}`]: () => json({ detail: "different email" }, 403),
    });
    renderAs(path, demoSession);
    await userEvent.click(
      await screen.findByRole("button", { name: m.accept }),
    );
    expect(await screen.findByText(m.wrongAccount.title)).toBeVisible();
    expect(
      screen.getByText(
        m.wrongAccount.description("invitee@example.org", "demo@example.org"),
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: m.wrongAccount.signOut }),
    ).toBeVisible();
  });

  it("says when the link is unknown (404)", async () => {
    stubApi({ [`GET ${previewUrl}`]: () => json({ detail: "x" }, 404) });
    renderAs(path, null);
    expect(await screen.findByText(m.notFound.title)).toBeVisible();
  });

  it.each(["cancelled", "expired", "accepted"] as const)(
    "says when the invitation is %s",
    async (status) => {
      stubApi({ [`GET ${previewUrl}`]: () => json(makePreview({ status })) });
      renderAs(path, null);
      expect(await screen.findByText(m.gone[status].title)).toBeVisible();
    },
  );

  it("says when accepting is refused as gone (410)", async () => {
    stubApi({
      [`GET ${previewUrl}`]: () => json(makePreview()),
      [`POST ${acceptUrl}`]: () =>
        json({ detail: "invitation is expired" }, 410),
    });
    renderAs(path, invitee);
    await userEvent.click(
      await screen.findByRole("button", { name: m.accept }),
    );
    expect(await screen.findByText(m.gone.expired.title)).toBeVisible();
  });

  it("reports an unexpected failure and lets the user try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubApi({
      [`GET ${previewUrl}`]: () => json(makePreview()),
      [`POST ${acceptUrl}`]: () => json({ detail: "boom" }, 500),
    });
    renderAs(path, invitee);
    await userEvent.click(
      await screen.findByRole("button", { name: m.accept }),
    );
    expect(await screen.findByText(m.failed)).toBeVisible();
    expect(screen.getByRole("button", { name: m.accept })).toBeEnabled();
  });
});
