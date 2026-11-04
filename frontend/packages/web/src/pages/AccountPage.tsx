import { zMeUpdateDto } from "@ehds-relay/api-client";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FormMessage,
  Icon,
  Input,
  LoadingStar,
  PageHeader,
  Toggle,
  fieldErrorId,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api";
import { countryName } from "../orgs/countries";
import { useSession, useSessionStore, useSignOut } from "../session/useSession";
import { AccountLayout } from "../shell/AccountLayout";
import { shellMessages } from "../shell/messages";
import { useSavedFlash } from "./useSavedFlash";

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
      <ProfileForm
        key={`profile-${user.id}`}
        name={user.name}
        email={user.email}
      />
      <OrganisationsSection />
      <NotificationsSection key={`notifications-${user.id}`} />
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
  const [saved, flashSaved, clearSaved] = useSavedFlash();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    clearSaved();
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
      flashSaved();
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
    <div className="max-w-[480px] rounded-card bg-white p-6 shadow-card">
      <h2 className="mb-4 text-lg font-semibold">{text.detailsTitle}</h2>
      <form
        noValidate
        aria-label={text.title}
        onSubmit={(event) => {
          void submit(event);
        }}
        className="flex flex-col gap-5"
      >
        <Field
          label={text.nameLabel}
          htmlFor="account-name"
          required
          error={error.name}
        >
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
              clearSaved();
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
        <p role="status" className="sr-only">
          {saved ? text.savedAnnouncement : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" busy={busy}>
            {busy ? (
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
          <Button
            type="button"
            variant="secondary"
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
    <section aria-labelledby="account-orgs" className="mt-10 max-w-[480px]">
      <h2 id="account-orgs" className="mb-3 text-lg font-semibold">
        {copy.title}
      </h2>
      {orgs.length === 0 ? (
        <EmptyState compact title={copy.none} />
      ) : (
        <ul aria-label={copy.title} className="flex flex-col gap-3">
          {orgs.map((org) => (
            <li
              key={org.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-white px-5 py-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="text-[1.15em] font-semibold break-words text-blue">
                  {org.name}
                </p>
                <p className="text-[0.9em] font-semibold text-ink-3">
                  {org.country ? countryName(org.country) : copy.unknownCountry}
                </p>
              </div>
              <Badge>{shellMessages.members.roles[org.role]}</Badge>
            </li>
          ))}
        </ul>
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
  const toast = useToast();
  const loading = useMinimumPending(query.isPending);

  const toggle = async (kind: string, enabled: boolean) => {
    setBusy(kind);
    try {
      const { data, response } = await api.PUT("/api/v1/me/notifications", {
        body: {
          settings: [{ kind: kind as "revalidation_reminder", enabled }],
        },
      });
      if (!data) {
        if (response.status !== 401)
          toast.show({ tone: "error", message: copy.failed });
        return;
      }
      setChanged(
        Object.fromEntries(data.settings.map((s) => [s.kind, s.enabled])),
      );
      toast.show({ tone: "success", message: copy.saved });
    } catch {
      toast.show({ tone: "error", message: copy.failed });
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
      {loading || query.isPending ? (
        <LoadingStar size="page" message={copy.loading} />
      ) : null}
      {query.isError && !loading ? (
        // About this section only, so said here rather than in a page banner.
        <EmptyState
          status
          title={copy.loadFailed}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void query.refetch();
              }}
            >
              {copy.retry}
            </Button>
          }
        />
      ) : null}
      {query.data && !loading ? (
        <ul className="flex flex-col gap-4 rounded-card bg-white p-6 shadow-card">
          {query.data.map((setting) => {
            const kind = copy.kinds[setting.kind];
            return (
              <li key={setting.kind}>
                <Toggle
                  id={`notification-${setting.kind}`}
                  label={kind?.label ?? setting.kind}
                  description={kind?.hint}
                  checked={changed[setting.kind] ?? setting.enabled}
                  disabled={busy === setting.kind}
                  onChange={(event) => {
                    void toggle(setting.kind, event.target.checked);
                  }}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-8 text-sm">
        <Link to="/orgs" className="underline underline-offset-4">
          {text.back}
        </Link>
      </p>
    </section>
  );
}
