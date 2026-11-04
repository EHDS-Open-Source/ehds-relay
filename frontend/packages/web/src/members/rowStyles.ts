// Shared looks for the user rows, their section headings and the account cards.

/** A section title inside a page (Users, Invitations, My organisations): H3 on the heading scale. */
export const sectionHeading =
  "mb-4 text-[length:var(--h3-size)] leading-[1.3] font-bold text-blue";

/** One user or invitation: a white card with the card shadow, 16px by 20px inside. */
export const rowCard =
  "flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 rounded-card bg-white px-5 py-4 shadow-card";

/** Name and email, 3px apart. */
export const rowInfo = "flex min-w-0 flex-col gap-[3px]";

/** The person's name: blue 600 at 1.15em. */
export const rowName =
  "text-[1.15em] leading-[1.3] font-semibold break-words text-blue";

/** The email under the name: ink 600 at 0.9em. */
export const rowEmail =
  "text-[0.9em] leading-[1.6] font-semibold break-all text-ink";

/** Tags and buttons on the right; they wrap under the name on phones. */
export const rowActions = "flex flex-wrap items-center justify-end gap-3";

/** A settings card: white, card shadow, no border, 560px at most. */
export const settingsCard = "max-w-[560px] rounded-card bg-white shadow-card";
