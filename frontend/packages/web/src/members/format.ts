export const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export const roleOptions: readonly ("standard" | "owner")[] = [
  "standard",
  "owner",
];
