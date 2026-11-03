import type { ReactNode } from "react";

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </ul>
  );
}
