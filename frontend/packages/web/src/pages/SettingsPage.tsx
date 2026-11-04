import {
  Button,
  EmptyState,
  Field,
  FormMessage,
  Icon,
  Input,
  NativeSelect,
  PageHeader,
  fieldErrorId,
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
import { useSavedFlash } from "./useSavedFlash";

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
  const [saved, flashSaved, clearSaved] = useSavedFlash();

  const listed = [...euCountryCodes, OTHER_COUNTRY];
  const options =
    org.country === null || listed.includes(org.country)
      ? listed
      : [org.country, ...listed];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    clearSaved();
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
          flashSaved();
        },
      },
    );
  };

  return (
    <form noValidate onSubmit={submit} className="flex max-w-xl flex-col gap-5">
      <Field
        label={text.nameLabel}
        htmlFor="settings-name"
        required
        error={errors.name}
      >
        <Input
          id="settings-name"
          value={name}
          autoComplete="organization"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={
            errors.name ? fieldErrorId("settings-name") : undefined
          }
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </Field>
      <Field
        label={text.countryLabel}
        htmlFor="settings-country"
        required
        error={errors.country}
      >
        <NativeSelect
          id="settings-country"
          value={country}
          aria-invalid={errors.country ? true : undefined}
          aria-describedby={
            errors.country ? fieldErrorId("settings-country") : undefined
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
      </Field>
      {update.isError ? (
        <FormMessage>
          {updateOrganisationError(errorStatus(update.error))}
        </FormMessage>
      ) : null}
      <p role="status" className="sr-only">
        {saved ? text.savedAnnouncement : null}
      </p>
      <div>
        <Button type="submit" busy={update.isPending}>
          {update.isPending ? (
            text.saving
          ) : saved ? (
            <>
              <Icon name="tick" size="sm" />
              {text.saved}
            </>
          ) : (
            text.save
          )}
        </Button>
      </div>
    </form>
  );
}
