import { zMeUpdateDto } from "@ehds-relay/api-client";
import {
  Button,
  EmptyState,
  Field,
  FieldHint,
  FormMessage,
  Icon,
  Input,
  LoadingStar,
  PageHeader,
  SaveButton,
  Toggle,
  cn,
  fieldErrorId,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api";
import {
  rowCard,
  rowEmail,
  rowInfo,
  rowName,
  sectionHeading,
  settingsCard,
} from "../members/rowStyles";
import { RoleTag } from "../members/tags";
import { countryName } from "../orgs/countries";
import { loginUrl } from "../session/login";
import { useSession, useSessionStore, useSignOut } from "../session/useSession";
import type { OrgRole } from "../session/types";
import { AccountLayout } from "../shell/AccountLayout";
import { shellMessages } from "../shell/messages";
import { isPasswordResult } from "./passwordResult";
import { useSavedFlash } from "./useSavedFlash";

const text = shellMessages.account;

/** The signed-in user's own details: name (editable) and email (from the identity provider). */
export function AccountPage() {
  const session = useSession();
  const user = session?.user;
  // Signing out empties the session before the redirect finishes.
  if (!user) return null;
  const orgs = session.orgs;
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
        // With one organisation the page knows which role to show.
        role={orgs.length === 1 ? orgs[0]!.role : undefined}
      />
      <PasswordSection />
      <OrganisationsSection />
      <NotificationsSection key={`notifications-${user.id}`} />
      {orgs.length === 0 ? (
        // The header has no way back without an organisation, so it is offered here.
        <Button asChild variant="secondary" className="mt-12">
          <Link to="/orgs">
            <Icon name="back" />
            {text.back}
          </Link>
        </Button>
      ) : null}
    </AccountLayout>
  );
}

function ProfileForm({
  name: savedName,
  email,
  role,
}: {
  name: string;
  email: string;
  role?: OrgRole;
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
      document.getElementById("account-name")?.focus();
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
    <section aria-labelledby="account-details">
      <h2 id="account-details" className={sectionHeading}>
        {text.detailsTitle}
      </h2>
      <form
        noValidate
        aria-label={text.title}
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <div className={`${settingsCard} flex flex-col gap-4 p-6`}>
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
          {role ? (
            <div
              data-part="role"
              className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-5"
            >
              <span
                id="account-role-label"
                className="text-[0.95em] leading-[1.6] font-semibold"
              >
                {text.role.label}
              </span>
              <RoleTag
                role={role}
                aria-describedby="account-role-label account-role-hint"
              />
              <FieldHint id="account-role-hint" className="w-full">
                {role === "owner"
                  ? text.role.ownerHint
                  : text.role.standardHint}
              </FieldHint>
            </div>
          ) : null}
        </div>
        {error.form ? (
          <FormMessage className="mt-5">{error.form}</FormMessage>
        ) : null}
        <p role="status" className="sr-only">
          {saved ? text.savedAnnouncement : null}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <SaveButton
            busy={busy}
            saved={saved}
            label={text.save}
            busyLabel={text.saving}
            savedLabel={text.saved}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void signOut();
            }}
          >
            {shellMessages.logOut}
          </Button>
        </div>
      </form>
    </section>
  );
}

/**
 * Changing the password happens at the identity provider, which asks for the current password
 * first and then sends the browser back here with the outcome in `?password=`.
 */
function PasswordSection() {
  const { password } = useSearch({ from: "/account" });
  // Other search values pass through the router untouched, so check again here.
  const result = isPasswordResult(password) ? password : undefined;
  const copy = text.password;
  return (
    <section aria-labelledby="account-password" className="mt-12 max-w-[560px]">
      <h2 id="account-password" className={cn(sectionHeading, "mb-2")}>
        {copy.title}
      </h2>
      <p className="mb-4 text-ink-3">{copy.description}</p>
      <div role="status">
        {result ? (
          <FormMessage
            tone={result === "error" ? "error" : "info"}
            // The status region announces it; a second alert would repeat it.
            role={undefined}
            className="mb-4"
            data-result={result}
          >
            {copy[result]}
          </FormMessage>
        ) : null}
      </div>
      <Button asChild variant="secondary">
        <a href={loginUrl({ redirect: "/account", action: "change_password" })}>
          {copy.change}
        </a>
      </Button>
    </section>
  );
}

/** The organisations the user belongs to, with their role in each. */
function OrganisationsSection() {
  const orgs = useSession()?.orgs ?? [];
  const copy = text.orgs;
  return (
    <section aria-labelledby="account-orgs" className="mt-12 max-w-[560px]">
      <h2 id="account-orgs" className={sectionHeading}>
        {copy.title}
      </h2>
      {orgs.length === 0 ? (
        <EmptyState compact title={copy.none} />
      ) : (
        <ul aria-label={copy.title} className="flex flex-col gap-3">
          {orgs.map((org) => (
            <li key={org.id} className={rowCard}>
              <div className={rowInfo}>
                <p className={rowName}>{org.name}</p>
                <p className={rowEmail}>
                  {org.country ? countryName(org.country) : copy.unknownCountry}
                </p>
              </div>
              <RoleTag role={org.role} />
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
      className="mt-12 max-w-[560px]"
    >
      <h2 id="account-notifications" className={cn(sectionHeading, "mb-2")}>
        {copy.title}
      </h2>
      <p className="mb-4 text-ink-3">{copy.description}</p>
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
        <ul className={`${settingsCard} flex flex-col gap-4 p-6`}>
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
    </section>
  );
}
