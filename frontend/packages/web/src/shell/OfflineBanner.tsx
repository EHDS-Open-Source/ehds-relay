import { Banner, useOnlineStatus } from "@ehds-relay/ui";

import { shellMessages } from "./messages";

/** Warning shown while the browser is offline. It has no dismiss: it goes on reconnecting. */
export function OfflineBanner({ className }: { className?: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Banner tone="warning" className={className}>
      {shellMessages.connection.offline}
    </Banner>
  );
}
