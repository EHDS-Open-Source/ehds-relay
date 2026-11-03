import type { ComponentProps, ReactNode } from "react";
import { Dialog } from "radix-ui";

import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface SideMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Shown under the title, e.g. the current organisation. */
  description?: string;
  closeLabel?: string;
  children: ReactNode;
}

/** Drawer that slides in from the right. Closes on Esc, overlay click and the close button. */
export function SideMenu({
  open,
  onOpenChange,
  title = messages.menuTitle,
  description,
  closeLabel = messages.closeMenu,
  children,
}: SideMenuProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          // Radix wants a description; opt out explicitly when there is none.
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-y-0 right-0 z-50 flex w-[300px] max-w-[85vw] flex-col rounded-l-3xl border-l bg-background shadow-2xl outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
        >
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <Dialog.Title className="text-[15px] font-semibold tracking-tight">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label={closeLabel}
              className="rounded-md p-1 text-xl leading-none text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span aria-hidden="true">✕</span>
            </Dialog.Close>
          </div>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function menuItemClass({
  active = false,
  danger = false,
}: { active?: boolean; danger?: boolean } = {}) {
  return cn(
    "flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    danger
      ? "text-destructive hover:bg-destructive/10"
      : "hover:bg-accent hover:text-accent-foreground",
    active && !danger && "bg-accent text-accent-foreground",
  );
}

/** A menu entry that runs an action rather than going to a page (e.g. sign out). */
export function SideMenuItem({
  danger = false,
  className,
  ...props
}: ComponentProps<"button"> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(menuItemClass({ danger }), className)}
      {...props}
    />
  );
}

export function SideMenuDivider() {
  return <hr className="mx-2.5 my-2 border-border" />;
}
