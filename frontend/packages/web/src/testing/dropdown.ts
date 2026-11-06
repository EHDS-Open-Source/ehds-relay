import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Opens a `Dropdown` by its trigger and chooses the option with this name. */
export async function chooseOption(
  trigger: HTMLElement,
  name: string | RegExp,
): Promise<void> {
  await userEvent.click(trigger);
  await userEvent.click(
    await within(await screen.findByRole("listbox")).findByRole("option", {
      name,
    }),
  );
}
