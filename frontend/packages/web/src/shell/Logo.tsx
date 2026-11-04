import { Icon } from "@ehds-relay/ui";

import { shellMessages } from "./messages";

/** Placeholder wordmark (asterisk plus name) until the supplied logo arrives; swap it here. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-[1.25em] font-bold text-white">
      <Icon name="star" size="lg" className="text-yellow" />
      {shellMessages.appName}
    </span>
  );
}
