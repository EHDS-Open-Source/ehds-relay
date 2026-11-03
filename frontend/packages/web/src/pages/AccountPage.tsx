import { zMeUpdateDto } from "@ehds-relay/api-client";
import {
  Button,
  Field,
  FormMessage,
  Input,
  PageHeader,
  fieldErrorId,
} from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api";
import { countryName } from "../orgs/countries";
import { useSession, useSessionStore, useSignOut } from "../session/useSession";
import { AccountLayout } from "../shell/AccountLayout";
import { shellMessages } from "../shell/messages";

const text = shellMessages.account;

/** The signed-in user's own details: name (editable) and email (from the identity provider). */
export function AccountPage() {
  const user = useSession()?.user;
  // Signing out empties the session before the redirect finishes.
  if (!user) return null;
  return (
    <AccountLayout>
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />
      <ProfileForm key={user.id} name={user.name} email={user.email} />
      <OrganisationsSection />
      <NotificationsSection key={user.id} />
    </AccountLayout>
  );
}

function ProfileForm({
  name: savedName,
  email,
}: {
  name: string;
  email: string;
}) {
  const store = useSessionStore();
  const signOut = useSignOut();
  const [name, setName] = useState(savedName);
  const [error, setError] = useState<{ name?: string; form?: string }>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const trimmed = name.trim();
    if (!zMeUpdateDto.safeParse({ name: trimmed }).success) {
      setError({ name: trimmed === "" ? text.nameRequired : text.nameTooLong });
      return;
    }
    setError({});
    setBusy(true);
    try {
      const { data, response } = await api.PATCH("/api/v1/me", {
        body: { name: trimmed },
      });
      if (!data) {
        // A 401 is handled for the whole app (back to sign-in).
        if (response.status !== 401) {
          setError({
            form: response.status === 422 ? text.invalid : text.failed,
          });
        }
        return;
      }
      setName(data.name);
      setSaved(true);
      // So the rest of the app shows the new name. The name is saved even if this fails;
      // the next page load picks it up.
      await store.refresh().catch(() => null);
    } catch {
      setError({ form: text.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[480px]">
      <form
        noValidate
        aria-label={text.title}
        onSubmit={(event) => {
          void submit(event);
        }}
        className="flex flex-col gap-5"
      >
        <Field label={text.nameLabel} htmlFor="account-name" error={error.name}>
          <Input
            id="account-name"
            value={name}
            autoComplete="name"
            aria-invalid={error.name ? true : undefined}
            aria-describedby={
              error.name ? fieldErrorId("account-name") : undefined
            }
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field
          label={text.emailLabel}
          htmlFor="account-email"
          hint={text.emailHint}
        >
          <Input
            id="account-email"
            type="email"
            value={email}
            readOnly
            className="bg-muted"
          />
        </Field>
        {error.form ? <FormMessage>{error.form}</FormMessage> : null}
        <p role="status" className="min-h-5 text-sm">
          {saved ? text.saved : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? text.saving : text.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void signOut();
            }}
          >
            {shellMessages.signOut}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** The organisations the user belongs to, with their role in each. */
function OrganisationsSection() {
  const orgs = useSession()?.orgs ?? [];
  const copy = text.orgs;
  return (
    <section aria-labelledby="account-orgs" className="mt-10 max-w-[640px]">
      <h2 id="account-orgs" className="mb-3 text-lg font-semibold">
        {copy.title}
      </h2>
      {orgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.none}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-medium">
                {copy.name}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {copy.country}
              </th>
              <th scope="col" className="py-2 font-medium">
                {copy.role}
              </th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-b">
                <th scope="row" className="py-2 pr-4 font-medium">
                  {org.name}
                </th>
                <td className="py-2 pr-4">
                  {org.country ? countryName(org.country) : copy.unknownCountry}
                </td>
                <td className="py-2">
                  {shellMessages.members.roles[org.role]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** One switch per kind of notification, each saved as soon as it is changed. */
function NotificationsSection() {
  const copy = text.notifications;
  const query = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/me/notifications");
      if (!data) throw new Error("notifications");
      return data.settings;
    },
    retry: false,
  });
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const toggle = async (kind: string, enabled: boolean) => {
    setMessage(null);
    setBusy(kind);
    try {
      const { data, response } = await api.PUT("/api/v1/me/notifications", {
        body: {
          settings: [{ kind: kind as "revalidation_reminder", enabled }],
        },
      });
      if (!data) {
        if (response.status !== 401)
          setMessage({ ok: false, text: copy.failed });
        return;
      }
      setChanged(
        Object.fromEntries(data.settings.map((s) => [s.kind, s.enabled])),
      );
      setMessage({ ok: true, text: copy.saved });
    } catch {
      setMessage({ ok: false, text: copy.failed });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-labelledby="account-notifications"
      className="mt-10 max-w-[480px]"
    >
      <h2 id="account-notifications" className="text-lg font-semibold">
        {copy.title}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">{copy.description}</p>
      {query.isPending ? <p className="text-sm">{copy.loading}</p> : null}
      {query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <FormMessage>{copy.loadFailed}</FormMessage>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void query.refetch();
            }}
          >
            {copy.retry}
          </Button>
        </div>
      ) : null}
      {query.data ? (
        <ul className="flex flex-col gap-3">
          {query.data.map((setting) => {
            const id = `notification-${setting.kind}`;
            const kind = copy.kinds[setting.kind];
            return (
              <li key={setting.kind} className="flex items-start gap-3">
                <input
                  id={id}
                  type="checkbox"
                  role="switch"
                  className="mt-1 size-4"
                  checked={changed[setting.kind] ?? setting.enabled}
                  disabled={busy === setting.kind}
                  aria-describedby={`${id}-hint`}
                  onChange={(event) => {
                    void toggle(setting.kind, event.target.checked);
                  }}
                />
                <div>
                  <label htmlFor={id} className="font-medium">
                    {kind?.label ?? setting.kind}
                  </label>
                  <p
                    id={`${id}-hint`}
                    className="text-sm text-muted-foreground"
                  >
                    {kind?.hint}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p
        role={message && !message.ok ? "alert" : "status"}
        className="mt-3 min-h-5 text-sm"
      >
        {message?.text}
      </p>
      <p className="mt-8 text-sm">
        <Link to="/orgs" className="underline underline-offset-4">
          {text.back}
        </Link>
      </p>
    </section>
  );
}
