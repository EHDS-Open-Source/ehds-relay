import { ToastProvider } from "@ehds-relay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MembersSection } from "../members/MembersSection";
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
// The required star adds hidden text to the label, so match on the start.
const emailLabel = new RegExp(`^${m.invitations.emailLabel}`);
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
  it("lists name, email and role as shadow cards with a Remove row action", async () => {
    stubApi({
      [`GET ${membersUrl}`]: () => json([ada, bob]),
      [`GET ${invitesUrl}`]: () => json([]),
    });
    renderAs(path, demoSession);
    expect(await screen.findByText("Bob Standard")).toBeVisible();
    expect(screen.getByText("bob@example.org")).toBeVisible();
    const row = screen.getByText("Bob Standard").closest("li")!;
    expect(row).toHaveClass("shadow-card", "rounded-card");
    expect(row).not.toHaveClass("border");
    expect(screen.getByText("Bob Standard")).toHaveClass("text-blue");
    expect(screen.getByText("bob@example.org")).toHaveClass("text-ink");
    const remove = within(row).getByRole("button", {
      name: `${m.list.remove} Bob Standard`,
    });
    expect(remove).toHaveAttribute("data-variant", "row");
    expect(remove.lastElementChild).toHaveAttribute("data-icon", "remove");
    expect(
      screen.getByRole("combobox", { name: m.list.roleFor("Bob Standard") }),
    ).toHaveValue("standard");
    expect(screen.getByText(`(${m.list.you})`)).toBeVisible();
  });

  it("keeps the role select compact, at the height of the row buttons", async () => {
    stubApi({
      [`GET ${membersUrl}`]: () => json([ada, bob]),
      [`GET ${invitesUrl}`]: () => json([]),
    });
    renderAs(path, demoSession);
    const select = await screen.findByRole("combobox", {
      name: m.list.roleFor("Bob Standard"),
    });
    expect(select).toHaveClass("h-[34px]", "w-36", "shrink-0");
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
      await screen.findByText(m.roleChanged("Bob Standard", "owner")),
    ).toBeVisible();
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
    expect(await screen.findByText(m.removed("Bob Standard"))).toBeVisible();
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

  it("shows the role as a tag to someone who cannot change it", async () => {
    stubApi({ [`GET ${membersUrl}`]: () => json([ada, bob]) });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <MembersSection
            orgId={ORG}
            currentUserId={ada.user_id}
            canChangeRoles={false}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    const row = (await screen.findByText("Bob Standard")).closest("li")!;
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const tag = within(row).getByText(m.roles.standard);
    expect(tag).toHaveAttribute("data-slot", "badge");
    expect(tag).toHaveClass("bg-blue-tint-90", "text-blue");
  });

  it("shows no controls and loads nothing for a standard member", async () => {
    const calls = stubApi({});
    renderAs(path, standardSession);
    expect(await screen.findByText(m.ownersOnly)).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Remove / }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByText(m.invitations.subline("Standard", "3 February 2026")),
    ).toBeVisible();
    // Invited people are not members yet: their address is in ink, not blue.
    expect(screen.getByText("new@example.org")).toHaveClass("text-ink");
    expect(screen.getByText("old@example.org")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: m.invitations.filters.expired }),
    );
    await waitFor(() => {
      expect(screen.queryByText("new@example.org")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("old@example.org")).toBeVisible();
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
      screen.getByLabelText(emailLabel),
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
    // Clicking Send takes people to the field that needs fixing
    expect(screen.getByLabelText(emailLabel)).toHaveFocus();
    await userEvent.type(screen.getByLabelText(emailLabel), "nope");
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
    await userEvent.type(screen.getByLabelText(emailLabel), "x@example.org");
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

  it("shows each status as a pill in its role tint", async () => {
    stubApi({
      [`GET ${membersUrl}`]: () => json([ada]),
      [`GET ${invitesUrl}`]: () =>
        json([
          pending,
          expired,
          makeInvitation({ id: "a", email: "a@x.org", status: "accepted" }),
          makeInvitation({ id: "c", email: "c@x.org", status: "cancelled" }),
        ]),
    });
    renderAs(path, demoSession);
    await screen.findByText("c@x.org");
    const pill = (status: string) =>
      document.querySelector(`[data-status=${status}]`)!;
    expect(pill("pending")).toHaveAttribute("data-variant", "info");
    expect(pill("pending")).toHaveTextContent(m.invitations.statuses.pending);
    expect(pill("accepted")).toHaveAttribute("data-variant", "success");
    expect(pill("expired")).toHaveAttribute("data-variant", "warning");
    expect(pill("cancelled")).toHaveClass("text-ink-3");
    // Neutral, so it carries an icon as well as the word.
    expect(pill("cancelled").querySelector("[data-icon=close]")).not.toBeNull();
  });

  it("offers Cancel invitation as a row action with the remove icon", async () => {
    open();
    const cancel = await screen.findByRole("button", {
      name: "Cancel invitation new@example.org",
    });
    expect(cancel).toHaveAttribute("data-variant", "row");
    expect(cancel.lastElementChild).toHaveAttribute("data-icon", "remove");
  });

  it("shows Sending… on the Resend being sent and keeps the others still", async () => {
    let answer: (response: Response) => void = () => undefined;
    open({
      [`POST ${invitesUrl}/inv-1/resend`]: () =>
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
    });
    await userEvent.click(
      await screen.findByRole("button", {
        name: `${m.invitations.resend} new@example.org`,
      }),
    );
    const busy = await screen.findByRole("button", {
      name: new RegExp(`^${m.invitations.resending}`),
    });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("button", {
        name: `${m.invitations.resend} old@example.org`,
      }),
    ).toBeDisabled();
    answer(json(pending));
    expect(
      await screen.findByText(m.invitations.resent("new@example.org")),
    ).toBeVisible();
  });

  it("puts the add-user icon after Send invitation", async () => {
    open();
    const send = await screen.findByRole("button", {
      name: m.invitations.send,
    });
    expect(send.lastElementChild).toHaveAttribute("data-icon", "addUser");
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
