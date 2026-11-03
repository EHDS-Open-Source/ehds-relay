import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  notFound,
  redirect,
  rootRouteId,
} from "@tanstack/react-router";

import { validateCatalogueSearch } from "../pages/catalogue/search";
import { isExportFormat, type ExportFormat } from "../datasets/download";
import { AccountPage } from "../pages/AccountPage";
import { CataloguePage } from "../pages/CataloguePage";
import { AcceptInvitationPage } from "../pages/AcceptInvitationPage";
import { DatasetDetailPage } from "../pages/DatasetDetailPage";
import { DatasetEditPage } from "../pages/DatasetEditPage";
import { DatasetExportPage } from "../pages/DatasetExportPage";
import { DatasetNewPage } from "../pages/DatasetNewPage";
import { MembersPage } from "../pages/MembersPage";
import { BareNotFound, NotFound } from "../pages/NotFound";
import { NewOrgPage } from "../pages/NewOrgPage";
import { OrgPickerPage } from "../pages/OrgPickerPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SignInPage } from "../pages/SignInPage";
import { OrgLayout } from "../shell/OrgLayout";
import type { RouterContext } from "./context";

// Code-based route tree (no generated file), so an extension can add routes to it later.

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: BareNotFound,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    const session = await context.session.load();
    throw redirect({ to: session ? "/orgs" : "/sign-in" });
  },
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "sign-in",
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; error?: string } => ({
    ...(typeof search.redirect === "string" && { redirect: search.redirect }),
    ...(typeof search.error === "string" && { error: search.error }),
  }),
  component: SignInPage,
});

// Public: the link in the invitation email. Works signed out; the session is loaded so the
// page knows whether someone is signed in.
const invitationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "invitations/$token",
  beforeLoad: async ({ context }) => {
    await context.session.load();
  },
  component: AcceptInvitationPage,
});

/** Sends a signed-out visitor to /sign-in, coming back here afterwards. */
async function requireSession({
  context,
  location,
}: {
  context: RouterContext;
  location: { href: string };
}) {
  if (!(await context.session.load())) {
    throw redirect({
      to: "/sign-in",
      search: { redirect: location.href },
    });
  }
}

// The user's own details. Outside any organisation, so it works without one.
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "account",
  beforeLoad: requireSession,
  component: AccountPage,
});

// Everything below /orgs needs a signed-in user.
const orgsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "orgs",
  beforeLoad: requireSession,
  component: Outlet,
});

const orgPickerRoute = createRoute({
  getParentRoute: () => orgsRoute,
  path: "/",
  // Nobody has to pick when there is nothing or only one thing to pick.
  beforeLoad: ({ context }) => {
    const orgs = context.session.get()?.orgs ?? [];
    if (orgs.length === 0) throw redirect({ to: "/orgs/new" });
    if (orgs.length === 1) {
      throw redirect({
        to: "/orgs/$orgId/catalogue",
        params: { orgId: orgs[0]!.id },
      });
    }
  },
  component: OrgPickerPage,
});

const newOrgRoute = createRoute({
  getParentRoute: () => orgsRoute,
  path: "new",
  component: NewOrgPage,
});

const orgRoute = createRoute({
  getParentRoute: () => orgsRoute,
  path: "$orgId",
  beforeLoad: ({ context, params }) => {
    // Only organisations the user belongs to exist as far as the UI is concerned.
    const isMember = context.session
      .get()
      ?.orgs.some((org) => org.id === params.orgId);
    if (!isMember) throw notFound({ routeId: rootRouteId });
  },
  component: OrgLayout,
  notFoundComponent: NotFound,
});

const orgIndexRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "/",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/orgs/$orgId/catalogue",
      params: { orgId: params.orgId },
    });
  },
});

const catalogueRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "catalogue",
  validateSearch: validateCatalogueSearch,
  component: CataloguePage,
});

const datasetNewRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "datasets/new",
  component: DatasetNewPage,
});

const datasetDetailRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "datasets/$datasetId",
  component: DatasetDetailPage,
});

const datasetEditRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "datasets/$datasetId/edit",
  // Set after the first save of a new dataset, so the edit page says how it went
  validateSearch: (
    search: Record<string, unknown>,
  ): { saved?: "draft" | "incomplete" } =>
    search.saved === "draft" || search.saved === "incomplete"
      ? { saved: search.saved }
      : {},
  component: DatasetEditPage,
});

const datasetExportRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "datasets/$datasetId/export",
  validateSearch: (
    search: Record<string, unknown>,
  ): { format?: ExportFormat } =>
    isExportFormat(search.format) ? { format: search.format } : {},
  component: DatasetExportPage,
});

const membersRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "members",
  component: MembersPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "settings",
  component: SettingsPage,
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  signInRoute,
  invitationRoute,
  accountRoute,
  orgsRoute.addChildren([
    orgPickerRoute,
    newOrgRoute,
    orgRoute.addChildren([
      orgIndexRoute,
      catalogueRoute,
      datasetNewRoute,
      datasetDetailRoute,
      datasetEditRoute,
      datasetExportRoute,
      membersRoute,
      settingsRoute,
    ]),
  ]),
]);
