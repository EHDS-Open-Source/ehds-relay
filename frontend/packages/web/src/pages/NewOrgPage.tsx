import {
  Button,
  FormMessage,
  Input,
  Label,
  NativeSelect,
  PageHeader,
} from "@ehds-relay/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { api } from "../api";
import { euCountryCodes, countryName, OTHER_COUNTRY } from "../orgs/countries";
import { useSessionStore } from "../session/useSession";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";
import { SignOutHint } from "./SignOutHint";

const text = shellMessages.newOrg;

export function NewOrgPage() {
  const store = useSessionStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    country?: string;
    form?: string;
  }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const found: typeof errors = {
      ...(trimmed === "" && { name: text.nameRequired }),
      ...(country === "" && { country: text.countryRequired }),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const { data, response } = await api.POST("/api/v1/organisations", {
        body: { name: trimmed, country },
      });
      if (!data) {
        setErrors({
          form: response.status === 422 ? text.invalid : text.failed,
        });
        return;
      }
      await store.refresh();
      await navigate({
        to: "/orgs/$orgId/catalogue",
        params: { orgId: data.id },
      });
    } catch {
      setErrors({ form: text.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BareLayout>
      <PageHeader title={text.title} description={text.description} />
      <p className="-mt-6 mb-8 text-sm text-muted-foreground">
        {text.invitedHint}
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          void submit(event);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-name">{text.nameLabel}</Label>
          <Input
            id="org-name"
            value={name}
            maxLength={200}
            autoComplete="organization"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "org-name-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {errors.name ? (
            <FormMessage id="org-name-error">{errors.name}</FormMessage>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-country">{text.countryLabel}</Label>
          <NativeSelect
            id="org-country"
            value={country}
            aria-invalid={errors.country ? true : undefined}
            aria-describedby={errors.country ? "org-country-error" : undefined}
            onChange={(event) => {
              setCountry(event.target.value);
            }}
          >
            <option value="">{text.countryPlaceholder}</option>
            {[...euCountryCodes, OTHER_COUNTRY].map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </NativeSelect>
          {errors.country ? (
            <FormMessage id="org-country-error">{errors.country}</FormMessage>
          ) : null}
        </div>
        {errors.form ? <FormMessage>{errors.form}</FormMessage> : null}
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? text.submitting : text.submit}
          </Button>
        </div>
      </form>
      <SignOutHint lead={text.signOutHint} />
    </BareLayout>
  );
}
