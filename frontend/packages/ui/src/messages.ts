// User-facing default text for shared components lives here, not inline in components,
// so it can be swapped for translations later in one place. Components also take these
// as props, so an app can pass its own wording.
export const messages = {
  skipToContent: "Skip to main content",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  menuTitle: "Menu",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Could not copy",
  cancel: "Cancel",
  confirm: "Confirm",
  statusDraft: "Draft",
  statusPublished: "Published",
} as const;
