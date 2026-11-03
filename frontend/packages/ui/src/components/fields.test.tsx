import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FormMessage } from "./form-message";
import { Input } from "./input";
import { Label } from "./label";
import { NativeSelect } from "./native-select";

describe("form fields", () => {
  it("labels an input and takes typing", async () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </>,
    );
    await userEvent.type(screen.getByLabelText("Name"), "Acme");
    expect(screen.getByLabelText("Name")).toHaveValue("Acme");
  });

  it("selects an option", async () => {
    render(
      <>
        <Label htmlFor="c">Country</Label>
        <NativeSelect id="c" defaultValue="">
          <option value="">Choose</option>
          <option value="FR">France</option>
        </NativeSelect>
      </>,
    );
    await userEvent.selectOptions(screen.getByLabelText("Country"), "FR");
    expect(screen.getByLabelText("Country")).toHaveValue("FR");
  });

  it("announces errors but not info", () => {
    render(
      <>
        <FormMessage>Broken</FormMessage>
        <FormMessage tone="info">Hint</FormMessage>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Broken");
    expect(screen.getByText("Hint")).not.toHaveAttribute("role");
  });
});
