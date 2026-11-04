import { useRef, type ComponentProps, type ReactNode } from "react";
import { Dialog } from "radix-ui";

import { Button } from "../components/button";
import { Icon } from "../icons";
import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface SideMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Shown at the top in yellow, e.g. the current organisation. */
  description?: string;
  closeLabel?: string;
  /** Small content at the foot of the panel, e.g. a status line. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Blue panel that slides in from the right. Closes on Esc, overlay click and the close button. */
export function SideMenu({
  open,
  onOpenChange,
  title = messages.menuTitle,
  description,
  closeLabel = messages.closeMenu,
  footer,
  children,
}: SideMenuProps) {
  // The menu is opened from outside (no Dialog.Trigger), so remember the opener to give focus back.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim duration-(--motion-enter) ease-(--ease-out) data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-surface="blue"
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          // Radix wants a description; opt out explicitly when there is none.
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-y-0 right-0 z-50 flex w-[400px] max-w-full flex-col overflow-y-auto bg-blue pt-[22px] pr-6 pb-[26px] pl-8 text-white outline-none duration-(--motion-enter) ease-(--ease-out) data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right max-md:w-full"
        >
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="icon"
              size="icon"
              onBlue
              className="self-end hover:border-white hover:bg-white"
              aria-label={closeLabel}
            >
              <Icon name="close" size="sm" />
            </Button>
          </Dialog.Close>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {/* The organisation, or an empty line of the same spacing when there is none */}
          {description ? (
            <Dialog.Description className="mt-3 mb-6 text-[1.25em] leading-[1.3] font-semibold text-yellow">
              {description}
            </Dialog.Description>
          ) : (
            <div className="mt-3 mb-6" />
          )}
          <div className="flex flex-col">{children}</div>
          {footer ? <div className="mt-auto pt-6 text-sm">{footer}</div> : null}
          <Icon
            name="star"
            size="lg"
            className="pointer-events-none absolute right-6 bottom-6 text-yellow"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A link in the blue panel: white, turning yellow on hover, with room for a 24px icon. */
export function menuLinkClass({ active = false }: { active?: boolean } = {}) {
  return cn(
    "flex w-full items-center gap-3 py-4 text-left text-[1.05em] leading-[normal] font-semibold no-underline transition-colors hover:text-yellow",
    active ? "text-yellow" : "text-white",
  );
}

export function menuItemClass({
  active = false,
  danger = false,
}: { active?: boolean; danger?: boolean } = {}) {
  return cn(
    "flex w-full items-center gap-3 rounded-field px-4 py-3 text-left text-sm font-medium transition-colors",
    danger
      ? "text-destructive hover:bg-destructive/10"
      : "hover:bg-accent hover:text-accent-foreground",
    active && !danger && "bg-accent text-accent-foreground",
  );
}

/** A menu entry that runs an action rather than going to a page. */
export function SideMenuItem({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(menuLinkClass(), className)}
      {...props}
    />
  );
}

export function SideMenuDivider() {
  return <hr className="border-white/20" />;
}

/** The yellow Log out pill at the end of the panel: content width, exit icon, white on hover. */
export function SideMenuLogOut({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <Button
      type="button"
      onBlue
      className={cn(
        "mt-6 h-12 gap-5 self-start pr-5 pl-6 text-[1.05em] hover:border-white hover:bg-white hover:text-blue",
        className,
      )}
      {...props}
    >
      {children}
      <Icon name="logOut" size="lg" />
    </Button>
  );
}
