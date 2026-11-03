import type { ReactNode } from "react";

/** Centred page without the app header, for sign-in and organisation selection. */
export function BareLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="content"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12"
    >
      {children}
    </main>
  );
}
