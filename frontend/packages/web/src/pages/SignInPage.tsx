import { Button, FormMessage, Icon } from "@ehds-relay/ui";
import { useSearch } from "@tanstack/react-router";

import { loginUrl } from "../session/login";
import { BareLayout, BelowCard, belowCardLinkClass } from "../shell/BareLayout";
import { cardButtonClass } from "../shell/cardButton";
import { shellMessages } from "../shell/messages";

const text = shellMessages.signIn;

/** Our own entry page. Both links leave the app: the API sends the browser on to Keycloak. */
export function SignInPage() {
  const { redirect, error } = useSearch({ from: "/sign-in" });

  return (
    <BareLayout
      title={text.title}
      description={
        <>
          {text.description.lead}
          <strong>{text.description.strong}</strong>
          {text.description.tail}
        </>
      }
      below={
        <>
          <BelowCard>
            {text.noAccount}{" "}
            <a
              href={loginUrl({ redirect, signup: true })}
              className={belowCardLinkClass}
            >
              {text.createAccount}
            </a>
          </BelowCard>
          {/* Keycloak's own sign-in page has the reset link; there is no standard way to
              open its reset page directly with this app's sign-in state. */}
          <p
            data-slot="forgot-password"
            className="w-full max-w-[620px] text-center text-[0.95em] text-ink-3"
          >
            {text.forgot}
          </p>
        </>
      }
    >
      {error === "signin_failed" ? (
        <FormMessage className="mb-6 text-error">{text.failed}</FormMessage>
      ) : null}
      <Button asChild size="lg" onBlue className={cardButtonClass}>
        <a href={loginUrl({ redirect })}>
          {text.action}
          <Icon name="signIn" size="lg" aria-hidden />
        </a>
      </Button>
    </BareLayout>
  );
}
