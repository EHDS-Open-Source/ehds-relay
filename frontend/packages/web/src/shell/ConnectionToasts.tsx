import { useOnlineStatus, useToast } from "@ehds-relay/ui";
import { useEffect, useRef } from "react";

import { shellMessages } from "./messages";

/** Shows the "back online" toast on reconnecting. Renders nothing; mount once. */
export function ConnectionToasts() {
  const online = useOnlineStatus();
  const toast = useToast();
  const wentOffline = useRef(false);
  const toastId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!online) {
      wentOffline.current = true;
      if (toastId.current !== undefined) toast.dismiss(toastId.current);
      toastId.current = undefined;
    } else if (wentOffline.current) {
      wentOffline.current = false;
      toastId.current = toast.show({
        tone: "success",
        message: shellMessages.connection.backOnline,
      });
    }
  }, [online, toast]);

  return null;
}
