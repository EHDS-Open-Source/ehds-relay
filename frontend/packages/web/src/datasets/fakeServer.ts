import type { Schemas } from "@ehds-relay/api-client";

import type { DatasetMetadata } from "./formValues";

// A stand-in for the dataset API in tests: keeps datasets in memory, checks versions,
// works out what is missing to publish (a short copy of the backend's rules), and records
// every request.

type DatasetDTO = Schemas["DatasetDTO"];

export interface RecordedRequest {
  method: string;
  path: string;
  headers: Headers;
  body: unknown;
}

const alwaysRequired = [
  "title",
  "description",
  "distributions",
  "structured_data",
  "provenance",
  "keyword",
  "health_theme",
  "health_category",
  "has_personal_data",
  "conforms_to",
  "access_rights",
  "applicable_legislation",
  "health_data_access_body",
  "type",
  "language",
  "health_data_holder",
  "publisher",
  "contact_points",
  "identifier",
  "generated_by",
] as const;

export function missingForPublish(m: DatasetMetadata): string[] {
  const has = (key: keyof DatasetMetadata) => {
    const v = m[key];
    return !(
      v === undefined ||
      v === null ||
      v === "" ||
      (Array.isArray(v) && !v.length)
    );
  };
  const missing: string[] = alwaysRequired.filter((key) => !has(key));
  if (m.structured_data && !has("variables")) missing.push("variables");
  if (m.has_personal_data && !has("number_of_unique_individuals")) {
    missing.push("number_of_unique_individuals");
  }
  return missing;
}

export interface FakeServerOptions {
  /** Respond with this instead, for the next save. */
  nextSaveResponse?: { status: number; body: unknown };
}

export function createFakeServer(seed: DatasetDTO[] = []) {
  const datasets = new Map(seed.map((d) => [d.id, d]));
  const requests: RecordedRequest[] = [];
  let nextId = 1;
  let override: FakeServerOptions["nextSaveResponse"];

  const json = (status: number, body: unknown) =>
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  function store(
    orgId: string,
    previous: DatasetDTO | undefined,
    metadata: DatasetMetadata,
    publish: boolean,
  ): DatasetDTO {
    const missing = missingForPublish(metadata);
    const dataset: DatasetDTO = {
      id: previous?.id ?? `00000000-0000-4000-8000-00000000000${nextId++}`,
      org_id: orgId,
      status: publish && !missing.length ? "published" : "draft",
      title: metadata.title?.[0]?.text ?? null,
      description: metadata.description?.[0]?.text ?? null,
      metadata: metadata,
      schema_version: "1",
      version: (previous?.version ?? 0) + 1,
      created_at: "2026-11-03T10:00:00Z",
      updated_at: "2026-11-03T10:00:00Z",
      missing_for_publish: missing,
    };
    datasets.set(dataset.id, dataset);
    return dataset;
  }

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const text = await request.text();
    const body: unknown = text ? JSON.parse(text) : undefined;
    requests.push({
      method: request.method,
      path: url.pathname,
      headers: request.headers,
      body,
    });
    const match =
      /^\/api\/v1\/organisations\/([^/]+)\/datasets(?:\/([^/]+))?$/.exec(
        url.pathname,
      );
    if (!match) return json(200, { status: "ok" });
    const [, orgId = "", id] = match;
    const save = body as {
      metadata: DatasetMetadata;
      publish: boolean;
      version?: number;
    };

    if (request.method !== "GET" && override) {
      const { status, body: responseBody } = override;
      override = undefined;
      return json(status, responseBody);
    }
    if (request.method === "POST" && !id) {
      return json(201, store(orgId, undefined, save.metadata, save.publish));
    }
    const existing = id ? datasets.get(id) : undefined;
    if (!existing) return json(404, { detail: "dataset not found" });
    if (request.method === "GET") return json(200, existing);
    if (request.method === "PUT") {
      if (save.version !== existing.version) {
        return json(409, { detail: "stale version" });
      }
      return json(200, store(orgId, existing, save.metadata, save.publish));
    }
    return json(405, { detail: "not allowed" });
  }

  return {
    datasets,
    requests,
    /** Requests to the dataset API only (not the health check). */
    saves: () => requests.filter((r) => r.method !== "GET"),
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      handle(input instanceof Request ? input : new Request(input, init)),
    respondOnce(status: number, body: unknown) {
      override = { status, body };
    },
    seed(
      orgId: string,
      metadata: DatasetMetadata,
      status: "draft" | "published",
    ) {
      const dataset = store(orgId, undefined, metadata, status === "published");
      return dataset;
    },
  };
}
