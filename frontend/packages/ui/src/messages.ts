// User-facing default text for shared components lives here, not inline in components,
// so it can be swapped for translations later in one place. Components also take these
// as props, so an app can pass its own wording.
export const messages = {
  skipToContent: "Skip to main content",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  menuTitle: "Menu",
  search: { label: "Search" },
  datasetCard: {
    draft: "Draft",
    overdue: "Overdue",
    reminder: "Revalidation due",
  },
  tagInput: {
    noun: { one: "tag", many: "tags" },
    placeholder: "Type and press Enter",
    addAnother: (one: string) => `Add another ${one}`,
    remove: (one: string, tag: string) => `Remove ${one} ${tag}`,
    added: (one: string, tag: string) => `Added ${one} \u201c${tag}\u201d.`,
    addedMany: (count: number, many: string) => `Added ${count} ${many}.`,
    removed: (one: string, tag: string) => `Removed ${one} \u201c${tag}\u201d.`,
    alreadyAdded: (tag: string) => `\u201c${tag}\u201d is already added.`,
    pressAgain: (tag: string) =>
      `Press Backspace again to remove \u201c${tag}\u201d.`,
  },
  repeatableList: { add: "Add", remove: "Remove" },
  required: "(required)",
  loading: "Loading…",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Could not copy",
  cancel: "Cancel",
  confirm: "Confirm",
  statusDraft: "Draft",
  statusPublished: "Published",
  detail: { empty: "Not provided" },
  feedback: { dismiss: "Dismiss", notifications: "Notifications" },
} as const;
