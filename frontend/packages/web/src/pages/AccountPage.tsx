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
import { useState, type FormEvent } from "react";

import { api } from "../api";
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
      // So the rest of the app shows the new name
      await store.refresh();
      setSaved(true);
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
      <p className="mt-10 text-sm">
        <Link to="/orgs" className="underline underline-offset-4">
          {text.back}
        </Link>
      </p>
    </div>
  );
}
