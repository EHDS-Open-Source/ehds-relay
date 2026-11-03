import {
  Button,
  EmptyState,
  FormMessage,
  Input,
  Label,
  NativeSelect,
  PageHeader,
} from "@ehds-relay/ui";
import { useParams } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { countryName, euCountryCodes, OTHER_COUNTRY } from "../orgs/countries";
import {
  errorStatus,
  updateOrganisationError,
  useUpdateOrganisation,
} from "../orgs/queries";
import { useSession } from "../session/useSession";
import type { SessionOrg } from "../session/types";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

const text = shellMessages.settings;
const MAX_NAME = 200;

/** Name and country of one organisation. Only owners can see or change them. */
export function SettingsPage() {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  const orgName = useOrgName();
  const org = useSession()?.orgs.find((item) => item.id === orgId);

  return (
    <>
      <PageHeader eyebrow={orgName} {...shellMessages.pages.settings} />
      {org?.role === "owner" ? (
        <SettingsForm org={org} />
      ) : (
        <EmptyState title={text.ownersOnly} description="" />
      )}
    </>
  );
}

function SettingsForm({ org }: { org: SessionOrg }) {
  const update = useUpdateOrganisation(org.id);
  const [name, setName] = useState(org.name);
  const [country, setCountry] = useState(org.country ?? "");
  const [errors, setErrors] = useState<{ name?: string; country?: string }>({});
  const [saved, setSaved] = useState(false);

  const listed = [...euCountryCodes, OTHER_COUNTRY];
  const options =
    org.country === null || listed.includes(org.country)
      ? listed
      : [org.country, ...listed];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const trimmed = name.trim();
    const found: typeof errors = {
      ...(trimmed === "" && { name: text.nameRequired }),
      ...(trimmed.length > MAX_NAME && { name: text.nameTooLong }),
      ...(country === "" && { country: text.countryRequired }),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    update.mutate(
      { name: trimmed, country },
      {
        onSuccess: () => {
          setName(trimmed);
          setSaved(true);
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={submit} className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-name">{text.nameLabel}</Label>
        <Input
          id="settings-name"
          value={name}
          autoComplete="organization"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "settings-name-error" : undefined}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        {errors.name ? (
          <FormMessage id="settings-name-error">{errors.name}</FormMessage>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-country">{text.countryLabel}</Label>
        <NativeSelect
          id="settings-country"
          value={country}
          aria-invalid={errors.country ? true : undefined}
          aria-describedby={
            errors.country ? "settings-country-error" : undefined
          }
          onChange={(event) => {
            setCountry(event.target.value);
          }}
        >
          {org.country === null ? (
            <option value="">{text.countryPlaceholder}</option>
          ) : null}
          {options.map((code) => (
            <option key={code} value={code}>
              {countryName(code)}
            </option>
          ))}
        </NativeSelect>
        {errors.country ? (
          <FormMessage id="settings-country-error">
            {errors.country}
          </FormMessage>
        ) : null}
      </div>
      {update.isError ? (
        <FormMessage>
          {updateOrganisationError(errorStatus(update.error))}
        </FormMessage>
      ) : null}
      {saved ? <p role="status">{text.saved}</p> : null}
      <div>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? text.saving : text.save}
        </Button>
      </div>
    </form>
  );
}
