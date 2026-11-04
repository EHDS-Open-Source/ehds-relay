import { Button, FormMessage, Icon } from "@ehds-relay/ui";
import { useSearch } from "@tanstack/react-router";

import { loginUrl } from "../session/login";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

/** Our own entry page. Both links leave the app: the API sends the browser on to Keycloak. */
export function SignInPage() {
  const { redirect, error } = useSearch({ from: "/sign-in" });

  return (
    <BareLayout
      title={shellMessages.signIn.title}
      description={shellMessages.signIn.description}
    >
      {error === "signin_failed" ? (
        <FormMessage className="mb-6 text-error">
          {shellMessages.signIn.failed}
        </FormMessage>
      ) : null}
      <div className="flex flex-col items-start gap-6">
        <Button asChild size="lg" onBlue>
          <a href={loginUrl({ redirect })}>
            <Icon name="signIn" aria-hidden />
            {shellMessages.signIn.action}
          </a>
        </Button>
        <p className="text-sm text-white">
          {shellMessages.signIn.noAccount}{" "}
          <a
            href={loginUrl({ redirect, signup: true })}
            className="font-semibold text-yellow no-underline hover:underline"
          >
            {shellMessages.signIn.createAccount}
          </a>
        </p>
      </div>
    </BareLayout>
  );
}
