import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { makeInvitation, makeMember, renderAs } from "../members/testUtils";
import { demoSession } from "../session/testing";
import { shellMessages } from "../shell/messages";
import {
  ORG,
  json,
  type Handler,
  standardSession,
  stubApi,
} from "./datasetTestUtils";

const m = shellMessages.members;
const path = `/orgs/${ORG}/members`;
const membersUrl = `/api/v1/organisations/${ORG}/members`;
const invitesUrl = `/api/v1/organisations/${ORG}/invitations`;

const ada = makeMember({ user_id: demoSession.user.id });
const bob = makeMember({
  user_id: "u-2",
  name: "Bob Standard",
  email: "bob@example.org",
  role: "standard",
  joined_at: "2026-02-10T10:00:00Z",
});

describe("members", () => {
  it("lists name, email, role and joined date", async () => {
    stubApi({
      [`GET ${membersUrl}`]: () => json([ada, bob]),
      [`GET ${invitesUrl}`]: () => json([]),
    });
    renderAs(path, demoSession);
    expect(await screen.findByText("Bob Standard")).toBeVisible();
    expect(screen.getByText("bob@example.org")).toBeVisible();
    expect(screen.getByText("10 Feb 2026")).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: m.list.roleFor("Bob Standard") }),
    ).toHaveValue("standard");
    expect(screen.getByText(`(${m.list.you})`)).toBeVisible();
  });

  it("changes a role and refreshes the list", async () => {
    let members = [ada, bob];
    const calls = stubApi({
      [`GET ${membersUrl}`]: () => json(members),
      [`GET ${invitesUrl}`]: () => json([]),
      [`PATCH ${membersUrl}/u-2`]: async (request) => {
        const body = (await request.json()) as { role: "owner" };
        members = [ada, { ...bob, role: body.role }];
        return json(members[1]);
      },
    });
    renderAs(path, demoSession);
    const select = await screen.findByRole("combobox", {
      name: m.list.roleFor("Bob Standard"),
    });
    await userEvent.selectOptions(select, "owner");
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: m.list.roleFor("Bob Standard") }),
      ).toHaveValue("owner");
    });
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch).toBeDefined();
    expect(
      calls.filter((c) => c.method === "GET" && c.url.endsWith("/members"))
        .length,
    ).toBe(2);
  });

  it("says why the last owner cannot be demoted", async () => {
    stubApi({
      [`GET ${membersUrl}`]: () => json([ada]),
      [`GET ${invitesUrl}`]: () => json([]),
      [`PATCH ${membersUrl}/${ada.user_id}`]: () =>
        json({ detail: "cannot remove or demote the last owner" }, 409),
    });
    renderAs(path, demoSession);
    await userEvent.selectOptions(
      await screen.findByRole("combobox", {
        name: m.list.roleFor("Ada Owner"),
      }),
      "standard",
    );
    expect(await screen.findByText(m.errors.lastOwner)).toBeVisible();
  });

  it("asks before removing, then removes", async () => {
    let members = [ada, bob];
    const calls = stubApi({
      [`GET ${membersUrl}`]: () => json(members),
      [`GET ${invitesUrl}`]: () => json([]),
      [`DELETE ${membersUrl}/u-2`]: () => {
        members = [ada];
        return new Response(null, { status: 204 });
      },
    });
    renderAs(path, demoSession);
    await userEvent.click(
      await screen.findByRole("button", {
        name: `${m.list.remove} Bob Standard`,
      }),
    );
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: m.removeDialog.confirm,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("Bob Standard")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it.each([
    [409, m.errors.lastOwner],
    [403, m.errors.forbidden],
  ])("shows a %i answer inside the remove dialog", async (status, text) => {
    stubApi({
      [`GET ${membersUrl}`]: () => json([ada]),
      [`GET ${invitesUrl}`]: () => json([]),
      [`DELETE ${membersUrl}/${ada.user_id}`]: () =>
        json({ detail: "x" }, status),
    });
    renderAs(path, demoSession);
    await userEvent.click(
      await screen.findByRole("button", { name: `${m.list.remove} Ada Owner` }),
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: m.removeDialog.confirm,
      }),
    );
    expect(
      await within(screen.getByRole("alertdialog")).findByText(text),
    ).toBeVisible();
  });

  it("shows no controls and loads nothing for a standard member", async () => {
    const calls = stubApi({});
    renderAs(path, standardSession);
    expect(await screen.findByText(m.ownersOnly)).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(calls.filter((c) => c.url.includes("/members"))).toHaveLength(0);
  });
});

describe("invitations", () => {
  const pending = makeInvitation();
  const expired = makeInvitation({
    id: "inv-2",
    email: "old@example.org",
    status: "expired",
    last_sent_at: "2026-01-20T10:00:00Z",
  });

  const open = (extra: Record<string, Handler> = {}) => {
    const calls = stubApi({
      [`GET ${membersUrl}`]: () => json([ada]),
      [`GET ${invitesUrl}`]: (request) => {
        const status = new URL(request.url).searchParams.get("status");
        return json(
          [pending, expired].filter((i) => !status || i.status === status),
        );
      },
      ...extra,
    });
    renderAs(path, demoSession);
    return calls;
  };

  it("lists email, role, date sent and status, and filters by status", async () => {
    const calls = open();
    expect(await screen.findByText("new@example.org")).toBeVisible();
    expect(screen.getByText("3 Feb 2026")).toBeVisible();
    expect(screen.getByText("old@example.org")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: m.invitations.filters.expired }),
    );
    await waitFor(() => {
      expect(screen.queryByText("new@example.org")).not.toBeInTheDocument();
    });
    expect(screen.getByText("old@example.org")).toBeVisible();
    expect(calls.some((c) => c.url.includes("status=expired"))).toBe(true);
  });

  it("invites with email and role and refreshes the list", async () => {
    let sentBody: unknown;
    const calls = open({
      [`POST ${invitesUrl}`]: async (request) => {
        const body = (await request.json()) as { email: string };
        sentBody = body;
        return json(makeInvitation({ id: "inv-3", email: body.email }), 201);
      },
    });
    await screen.findByText("new@example.org");
    await userEvent.type(
      screen.getByLabelText(m.invitations.emailLabel),
      "carol@example.org",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(m.invitations.roleLabel),
      "owner",
    );
    await userEvent.click(
      screen.getByRole("button", { name: m.invitations.send }),
    );
    expect(
      await screen.findByText(m.invitations.sent("carol@example.org")),
    ).toBeVisible();
    expect(sentBody).toEqual({
      email: "carol@example.org",
      role: "owner",
    });
    await waitFor(() => {
      expect(
        calls.filter(
          (c) => c.method === "GET" && c.url.includes("/invitations"),
        ).length,
      ).toBe(2);
    });
  });

  it("checks the email before sending", async () => {
    const calls = open();
    await screen.findByText("new@example.org");
    await userEvent.click(
      screen.getByRole("button", { name: m.invitations.send }),
    );
    expect(await screen.findByText(m.invitations.emailRequired)).toBeVisible();
    await userEvent.type(
      screen.getByLabelText(m.invitations.emailLabel),
      "nope",
    );
    await userEvent.click(
      screen.getByRole("button", { name: m.invitations.send }),
    );
    expect(await screen.findByText(m.invitations.emailInvalid)).toBeVisible();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it.each([
    [
      "already a member of this organisation",
      m.invitations.errors.alreadyMember,
    ],
    [
      "already invited; resend the pending invitation instead",
      m.invitations.errors.alreadyInvited,
    ],
  ])("explains the 409 %s", async (detail, message) => {
    open({ [`POST ${invitesUrl}`]: () => json({ detail }, 409) });
    await screen.findByText("new@example.org");
    await userEvent.type(
      screen.getByLabelText(m.invitations.emailLabel),
      "x@example.org",
    );
    await userEvent.click(
      screen.getByRole("button", { name: m.invitations.send }),
    );
    expect(await screen.findByText(message)).toBeVisible();
  });

  it("resends an invitation", async () => {
    const calls = open({
      [`POST ${invitesUrl}/inv-2/resend`]: () =>
        json(makeInvitation({ id: "inv-2", email: "old@example.org" })),
    });
    await userEvent.click(
      await screen.findByRole("button", {
        name: `${m.invitations.resend} old@example.org`,
      }),
    );
    expect(
      await screen.findByText(m.invitations.resent("old@example.org")),
    ).toBeVisible();
    expect(calls.some((c) => c.url.endsWith("/inv-2/resend"))).toBe(true);
  });

  it("says when a resend is refused", async () => {
    open({
      [`POST ${invitesUrl}/inv-1/resend`]: () =>
        json({ detail: "invitation is no longer pending" }, 409),
    });
    await userEvent.click(
      await screen.findByRole("button", {
        name: `${m.invitations.resend} new@example.org`,
      }),
    );
    expect(
      await screen.findByText(m.invitations.errors.notPending),
    ).toBeVisible();
  });

  it("offers cancel only on pending invitations, and asks first", async () => {
    const calls = open({
      [`DELETE ${invitesUrl}/inv-1`]: () => new Response(null, { status: 204 }),
    });
    await screen.findByText("old@example.org");
    expect(
      screen.getAllByRole("button", { name: /^Cancel invitation / }),
    ).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Cancel invitation new@example.org" }),
    );
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: m.invitations.cancelDialog.confirm,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
  });

  it("shows a 409 on cancel inside the dialog", async () => {
    open({
      [`DELETE ${invitesUrl}/inv-1`]: () =>
        json({ detail: "invitation is no longer pending" }, 409),
    });
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Cancel invitation new@example.org",
      }),
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: m.invitations.cancelDialog.confirm,
      }),
    );
    expect(
      await within(screen.getByRole("alertdialog")).findByText(
        m.invitations.errors.notPending,
      ),
    ).toBeVisible();
  });
});
