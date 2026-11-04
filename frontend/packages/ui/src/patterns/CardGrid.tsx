import type { ReactNode } from "react";

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-6 p-0">
      {children}
    </ul>
  );
}
