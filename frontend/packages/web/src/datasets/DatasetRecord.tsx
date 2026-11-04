import { DetailField, DetailSection } from "@ehds-relay/ui";
import type { ReactNode } from "react";

import { shellMessages } from "../shell/messages";
import { datasetSections, fieldLabel, type FieldKey } from "./fields";
import type { DatasetMetadata } from "./formValues";

const m = shellMessages.datasets;

/** How the record view renders a field's value. */
type FieldKind =
  | "langTexts"
  | "text"
  | "boolean"
  | "number"
  | "accessRights"
  | "terms"
  | "strings"
  | "organisation"
  | "contactPoints"
  | "distributions"
  | "variables"
  | "temporal"
  | "turtle";

// Every field needs a kind, so a field added to the map cannot be left out of the record
const fieldKinds: Record<FieldKey, FieldKind> = {
  title: "langTexts",
  description: "langTexts",
  distributions: "distributions",
  structured_data: "boolean",
  variables: "variables",
  provenance: "text",
  keyword: "strings",
  health_theme: "terms",
  health_category: "terms",
  coding_system: "terms",
  has_personal_data: "boolean",
  conforms_to: "terms",
  access_rights: "accessRights",
  applicable_legislation: "terms",
  health_data_access_body: "organisation",
  geographical_coverage: "terms",
  type: "terms",
  number_of_records: "number",
  number_of_unique_individuals: "number",
  language: "terms",
  code_values: "strings",
  temporal_coverage: "temporal",
  health_data_holder: "organisation",
  publisher: "organisation",
  contact_points: "contactPoints",
  identifier: "strings",
  generated_by: "terms",
  quantum_label: "turtle",
};

interface FieldDef {
  key: FieldKey;
  kind: FieldKind;
}

type Term = { label: string; uri: string };
type Organisation = NonNullable<DatasetMetadata["health_data_holder"]>;
type ContactPoint = { name: string; email: string };

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    // Temporal coverage with neither date is empty
    return Object.values(value).some((v) => v !== null && v !== undefined);
  }
  return true;
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link">
      {children}
    </a>
  );
}

function TermLink({ term }: { term: Term }) {
  return <ExternalLink href={term.uri}>{term.label}</ExternalLink>;
}

function List({ children }: { children: ReactNode[] }) {
  return (
    <ul className="space-y-1">
      {children.map((child, i) => (
        <li key={i}>{child}</li>
      ))}
    </ul>
  );
}

function Contact({ contact }: { contact: ContactPoint }) {
  return (
    <>
      {contact.name} (<a href={`mailto:${contact.email}`}>{contact.email}</a>)
    </>
  );
}

function Organisation({
  org,
  description,
}: {
  org: Organisation;
  description?: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">{org.name}</p>
      {description ? <p>{description}</p> : null}
      {org.type ? (
        <p>
          {m.record.organisationType}: <TermLink term={org.type} />
        </p>
      ) : null}
      {org.contact_point ? (
        <p>
          {m.record.contact}: <Contact contact={org.contact_point} />
        </p>
      ) : null}
    </div>
  );
}

function formatDate(iso: string | null | undefined, missing: string): string {
  return iso ?? missing;
}

function renderValue(def: FieldDef, metadata: DatasetMetadata): ReactNode {
  switch (def.kind) {
    case "langTexts": {
      const texts = metadata[def.key as "title" | "description"] ?? [];
      return (
        <List>
          {texts.map((t) => (
            <span key={`${t.lang}-${t.text}`}>
              {t.text} <span className="text-muted-foreground">({t.lang})</span>
            </span>
          ))}
        </List>
      );
    }
    case "text":
      return metadata[def.key as "provenance"];
    case "turtle":
      return (
        <pre className="max-h-80 overflow-auto rounded-[14px] bg-code-bg p-4 font-mono text-xs font-normal whitespace-pre text-code-text">
          {metadata.quantum_label}
        </pre>
      );
    case "boolean":
      return metadata[def.key as "structured_data"] ? m.yes : m.no;
    case "number":
      return metadata[def.key as "number_of_records"]?.toLocaleString("en");
    case "accessRights": {
      const value = metadata.access_rights;
      return value ? m.accessRights[value] : null;
    }
    case "terms": {
      const terms = (metadata[def.key as "keyword"] ?? []) as unknown as Term[];
      return (
        <List>
          {terms.map((t) => (
            <TermLink key={t.uri} term={t} />
          ))}
        </List>
      );
    }
    case "strings": {
      const items = metadata[def.key as "keyword"] ?? [];
      return items.join(", ");
    }
    case "organisation": {
      const org = metadata[def.key as "publisher"];
      if (!org) return null;
      return (
        <Organisation
          org={org}
          description={"description" in org ? org.description : null}
        />
      );
    }
    case "contactPoints":
      return (
        <List>
          {(metadata.contact_points ?? []).map((c) => (
            <Contact key={`${c.name}-${c.email}`} contact={c} />
          ))}
        </List>
      );
    case "distributions":
      return (
        <List>
          {(metadata.distributions ?? []).map((d) => (
            <div key={d.access_url} className="space-y-1">
              {d.title ? <p className="font-medium">{d.title}</p> : null}
              {d.description ? <p>{d.description}</p> : null}
              <p>
                {m.record.accessUrl}:{" "}
                <ExternalLink href={d.access_url}>{d.access_url}</ExternalLink>
              </p>
              {d.format ? (
                <p>
                  {m.record.format}: <TermLink term={d.format} />
                </p>
              ) : null}
              <p>
                {m.record.legislation}:{" "}
                {d.applicable_legislation.map((t, i) => (
                  <span key={t.uri}>
                    {i > 0 ? ", " : ""}
                    <TermLink term={t} />
                  </span>
                ))}
              </p>
            </div>
          ))}
        </List>
      );
    case "variables":
      return (
        <List>
          {(metadata.variables ?? []).map((v) => (
            <span key={v.name}>
              <span className="font-medium">{v.name}</span> ({v.data_type}):{" "}
              {v.definition}
              {v.coding_system ? (
                <>
                  {" "}
                  <ExternalLink href={v.coding_system}>
                    {v.coding_system}
                  </ExternalLink>
                </>
              ) : null}
            </span>
          ))}
        </List>
      );
    case "temporal": {
      const t = metadata.temporal_coverage;
      return t
        ? `${formatDate(t.start, m.record.unknownStart)} – ${formatDate(t.end, m.record.unknownEnd)}`
        : null;
    }
  }
}

/** Every filled-in field of a dataset, grouped and ordered like the form. */
export function DatasetRecord({ metadata }: { metadata: DatasetMetadata }) {
  return (
    <>
      {datasetSections.map((section) => {
        const filled = section.fields
          .filter((key) => isFilled(metadata[key]))
          .map((key): FieldDef => ({ key, kind: fieldKinds[key] }));
        if (filled.length === 0) return null;
        return (
          <DetailSection
            key={section.id}
            id={`record-${section.id}`}
            title={section.title}
          >
            {filled.map((def) => (
              <DetailField
                key={def.key}
                id={`record-${def.key}`}
                label={fieldLabel(def.key)}
              >
                {renderValue(def, metadata)}
              </DetailField>
            ))}
          </DetailSection>
        );
      })}
    </>
  );
}
