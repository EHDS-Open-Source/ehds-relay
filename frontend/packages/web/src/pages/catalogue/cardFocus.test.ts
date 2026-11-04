import { afterEach, describe, expect, it } from "vitest";

import { cardOpened, takeLastOpenedCard } from "./cardFocus";

afterEach(() => {
  document.body.innerHTML = "";
  takeLastOpenedCard();
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("card focus", () => {
  it("focuses the next page's heading once it shows", async () => {
    document.body.innerHTML =
      '<main><h1>Catalogue</h1><a id="card" href="/x">Card</a></main>';
    const card = document.getElementById("card")!;
    card.focus();
    cardOpened("d1", card);
    // The record replaces the catalogue, first a loading state, then its heading.
    document.body.innerHTML = "<main><p>Loading</p></main>";
    await tick();
    document.querySelector("main")!.innerHTML = "<h1>Record</h1>";
    await tick();
    const heading = document.querySelector("h1")!;
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("leaves focus alone if something else took it", async () => {
    document.body.innerHTML =
      '<main><h1>Catalogue</h1><a id="card" href="/x">Card</a></main>';
    cardOpened("d1", document.getElementById("card")!);
    document.body.innerHTML =
      '<main><button id="b">Other</button><h1>Record</h1></main>';
    document.getElementById("b")!.focus();
    await tick();
    expect(document.getElementById("b")).toHaveFocus();
  });

  it("hands back the opened card once", () => {
    const link = document.createElement("a");
    cardOpened("d7", link);
    expect(takeLastOpenedCard()).toBe("d7");
    expect(takeLastOpenedCard()).toBeNull();
  });
});
