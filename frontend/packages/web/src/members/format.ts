export const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
});

export const roleOptions: readonly ("standard" | "owner")[] = [
  "standard",
  "owner",
];
