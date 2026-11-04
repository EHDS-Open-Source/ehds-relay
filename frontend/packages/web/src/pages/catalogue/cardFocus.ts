// Keyboard and screen reader users keep their place around a dataset card: opening a card
// moves focus to the record's heading, and coming back to the catalogue puts focus on the
// card that was opened.

let lastOpenedId: string | null = null;
let stopWaiting: (() => void) | null = null;

/** How long to wait for the record heading while the record loads. */
const HEADING_TIMEOUT_MS = 10_000;

/**
 * Remembers the card and, once the next page shows its own level-one heading, focuses it.
 * Call it when a card link is followed.
 */
export function cardOpened(datasetId: string, from: HTMLElement): void {
  lastOpenedId = datasetId;
  stopWaiting?.();
  const startHeading = document.querySelector("h1");
  let timer = 0;
  const tryFocus = () => {
    const heading = document.querySelector<HTMLElement>("main h1");
    if (!heading || heading === startHeading || !heading.isConnected)
      return false;
    // Something else took focus on purpose meanwhile: leave it there.
    const active = document.activeElement;
    if (active && active !== document.body && active !== from) return true;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus();
    return true;
  };
  const observer = new MutationObserver(() => {
    if (tryFocus()) stop();
  });
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timer);
    if (stopWaiting === stop) stopWaiting = null;
  };
  stopWaiting = stop;
  observer.observe(document.body, { childList: true, subtree: true });
  timer = window.setTimeout(stop, HEADING_TIMEOUT_MS);
}

/** The card opened last, once: the catalogue focuses it when it shows again. */
export function takeLastOpenedCard(): string | null {
  const id = lastOpenedId;
  lastOpenedId = null;
  return id;
}
