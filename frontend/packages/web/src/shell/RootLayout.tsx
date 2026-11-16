import { Outlet } from "@tanstack/react-router";

import { ConnectionToasts } from "./ConnectionToasts";

/** Root route component: watches the connection once for every page. */
export function RootLayout() {
  return (
    <>
      <ConnectionToasts />
      <Outlet />
    </>
  );
}
