import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  notFound,
  redirect,
  rootRouteId,
} from "@tanstack/react-router";

import { CataloguePage } from "../pages/CataloguePage";
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
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.session.get() ? "/orgs" : "/sign-in" });
  },
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "sign-in",
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: SignInPage,
});

// Everything below /orgs needs a signed-in user.
const orgsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "orgs",
  beforeLoad: ({ context, location }) => {
    if (!context.session.get()) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
  },
  component: Outlet,
});

const orgPickerRoute = createRoute({
  getParentRoute: () => orgsRoute,
  path: "/",
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
  component: DatasetEditPage,
});

const datasetExportRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "datasets/$datasetId/export",
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
