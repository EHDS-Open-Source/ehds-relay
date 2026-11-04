import type { ReactNode, Ref } from "react";

export function CardGrid({
  children,
  ref,
}: {
  children: ReactNode;
  ref?: Ref<HTMLUListElement>;
}) {
  return (
    <ul
      ref={ref}
      className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-6 p-0"
    >
      {children}
    </ul>
  );
}
