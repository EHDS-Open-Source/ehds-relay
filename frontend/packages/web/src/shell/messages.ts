// User-facing text for the app shell and the placeholder pages. Nav labels live in nav.ts.
// Kept out of components so it can be swapped for translations later in one place.
export const shellMessages = {
  appName: "EHDS Relay",
  menuTitle: "Menu",
  signOut: "Sign out",
  notBuilt: {
    title: "Not built yet",
    description: "This screen is a placeholder and will be filled in soon.",
  },
  pages: {
    catalogue: {
      title: "Dataset Catalogue",
      description:
        "A registry of health datasets described using the Health DCAT-AP metadata standard.",
    },
    datasetNew: { title: "New dataset" },
    datasetDetail: { title: "Dataset" },
    datasetEdit: { title: "Edit dataset" },
    datasetExport: { title: "Export dataset" },
    members: {
      title: "Members",
      description:
        "People who belong to this organisation and what they can do.",
    },
    settings: {
      title: "Organisation settings",
      description: "Manage this organisation.",
    },
  },
  signIn: {
    title: "Sign in",
    description: "Sign-in is not connected yet. Continue with the demo user.",
    continue: "Continue as demo user",
  },
  orgPicker: {
    title: "Select your organisation",
    description: "Choose which organisation you want to work in.",
  },
  newOrg: {
    title: "Create an organisation",
    description: "Set up a new organisation to publish datasets from.",
  },
  notFound: {
    title: "Page not found",
    description: "There is nothing at this address.",
    back: "Back to the start",
  },
} as const;
