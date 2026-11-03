import type { ReactNode } from "react";

import { messages } from "../messages";

export interface AppShellProps {
  header: ReactNode;
  /** Optional section navigation beside the content (not the app menu). */
  sidebar?: ReactNode;
  skipLabel?: string;
  children: ReactNode;
}

/** Page frame: skip link, header, optional sidebar and the main content area. */
export function AppShell({
  header,
  sidebar,
  skipLabel = messages.skipToContent,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        {skipLabel}
      </a>
      {header}
      <div className="flex flex-1">
        {sidebar ? (
          <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
            {sidebar}
          </aside>
        ) : null}
        <main
          id="content"
          tabIndex={-1}
          className="min-w-0 flex-1 outline-none"
        >
          <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-14 sm:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
