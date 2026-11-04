import type { ApiClient } from "@ehds-relay/api-client";
import { useEffect, useState } from "react";

import { api } from "./api";
import { messages } from "./messages";

type Health =
  | { state: "loading" }
  | { state: "ok"; status: string }
  | { state: "unavailable" };

/** Shows the API's liveness status, fetched through the generated client. */
export function HealthStatus({
  client = api,
  className = "text-sm text-muted-foreground",
}: {
  client?: ApiClient;
  className?: string;
}) {
  const [health, setHealth] = useState<Health>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    client
      .GET("/healthz", { signal: controller.signal })
      .then(({ data }) => {
        setHealth(
          data
            ? { state: "ok", status: data.status }
            : { state: "unavailable" },
        );
      })
      .catch(() => {
        // Aborted on unmount, or the network is down.
        if (!controller.signal.aborted) setHealth({ state: "unavailable" });
      });
    return () => controller.abort();
  }, [client]);

  return (
    <p role="status" className={className}>
      {health.state === "loading" && messages.healthChecking}
      {health.state === "ok" && messages.healthStatus(health.status)}
      {health.state === "unavailable" && messages.healthUnavailable}
    </p>
  );
}
