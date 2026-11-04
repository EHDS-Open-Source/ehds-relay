import {
  CodeBlock,
  DetailField,
  DetailSection,
  Icon,
  KeywordPill,
} from "@ehds-relay/ui";
import { Fragment, type ReactNode } from "react";

import { shellMessages } from "../shell/messages";
import { fieldLabel, type FieldKey } from "./fields";
import type { DatasetMetadata } from "./formValues";
import { formatIsoDate } from "./reminderDates";

const m = shellMessages.datasets;
const r = m.record;

type Term = { label: string; uri: string };
type Organisation = NonNullable<DatasetMetadata["health_data_holder"]>;
type ContactPoint = { name: string; email: string };

// The record groups fields for reading, not like the form: who and what first, then access
// and content, then variables and keywords. Every field is listed, empty ones with a dash.
const descriptionFields = [
  "identifier",
  "type",
  "publisher",
  "health_data_holder",
  "contact_points",
  "language",
  "geographical_coverage",
  "temporal_coverage",
  "provenance",
  "generated_by",
] as const satisfies readonly FieldKey[];

const accessFields = [
  "access_rights",
  "has_personal_data",
  "health_data_access_body",
  "applicable_legislation",
  "health_category",
  "health_theme",
  "coding_system",
  "code_values",
  "conforms_to",
  "structured_data",
  "number_of_records",
  "number_of_unique_individuals",
  "distributions",
] as const satisfies readonly FieldKey[];

/** Fields set as running text rather than short values. */
const longFields: ReadonlySet<FieldKey> = new Set(["provenance"]);

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

/** Quieter text after a value, e.g. a variable's data type. */
function Meta({ children }: { children: ReactNode }) {
  return <span className="font-normal text-ink-3">{children}</span>;
}

/** Terms as links, one after another on a line. */
function Terms({ terms }: { terms: readonly Term[] | null | undefined }) {
  if (!terms || terms.length === 0) return null;
  return (
    <>
      {terms.map((t, i) => (
        <Fragment key={t.uri}>
          {i > 0 ? ", " : ""}
          <ExternalLink href={t.uri}>{t.label}</ExternalLink>
        </Fragment>
      ))}
    </>
  );
}

function Contact({ contact }: { contact: ContactPoint }) {
  return (
    <>
      {contact.name} ·{" "}
      <a href={`mailto:${contact.email}`} className="link">
        {contact.email}
      </a>
    </>
  );
}

function OrganisationValue({ org }: { org: Organisation }) {
  const description =
    "description" in org && typeof org.description === "string"
      ? org.description
      : null;
  return (
    <>
      {org.name}
      {description ? (
        <span className="block">
          <Meta>{description}</Meta>
        </span>
      ) : null}
      {org.type ? (
        <span className="block">
          <Meta>
            {r.organisationType}: <Terms terms={[org.type]} />
          </Meta>
        </span>
      ) : null}
      {org.contact_point ? (
        <span className="block">
          <Meta>
            {r.contact}: <Contact contact={org.contact_point} />
          </Meta>
        </span>
      ) : null}
    </>
  );
}

function Lines({ children }: { children: ReactNode[] }) {
  if (children.length === 0) return null;
  return (
    <>
      {children.map((child, i) => (
        <span key={i} className="block">
          {child}
        </span>
      ))}
    </>
  );
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function fieldValue(key: FieldKey, metadata: DatasetMetadata): ReactNode {
  switch (key) {
    case "provenance":
      return metadata.provenance;
    case "structured_data":
    case "has_personal_data": {
      const value = metadata[key];
      return value === null || value === undefined
        ? null
        : value
          ? m.yes
          : m.no;
    }
    case "number_of_records":
    case "number_of_unique_individuals":
      return metadata[key]?.toLocaleString("en-GB");
    case "access_rights": {
      const value = metadata.access_rights;
      return value ? m.accessRights[value] : null;
    }
    case "identifier":
    case "code_values":
      return hasValue(metadata[key]) ? (metadata[key] ?? []).join(", ") : null;
    case "type":
    case "language":
    case "geographical_coverage":
    case "generated_by":
    case "applicable_legislation":
    case "health_category":
    case "health_theme":
    case "coding_system":
    case "conforms_to":
      return hasValue(metadata[key]) ? <Terms terms={metadata[key]} /> : null;
    case "publisher":
    case "health_data_holder":
    case "health_data_access_body": {
      const org = metadata[key];
      return org ? <OrganisationValue org={org} /> : null;
    }
    case "contact_points":
      return hasValue(metadata.contact_points) ? (
        <Lines>
          {(metadata.contact_points ?? []).map((c) => (
            <Contact key={`${c.name}-${c.email}`} contact={c} />
          ))}
        </Lines>
      ) : null;
    case "temporal_coverage": {
      const t = metadata.temporal_coverage;
      if (!t || (!t.start && !t.end)) return null;
      return (
        <span className="inline-flex flex-wrap items-center gap-3">
          <span>{t.start ? formatIsoDate(t.start) : r.unknownStart}</span>
          <Icon name="next" size="sm" label={r.to} className="text-blue" />
          <span>{t.end ? formatIsoDate(t.end) : r.unknownEnd}</span>
        </span>
      );
    }
    case "distributions":
      return hasValue(metadata.distributions) ? (
        <Lines>
          {(metadata.distributions ?? []).map((d) => (
            <span key={d.access_url} className="block">
              {d.title ?? d.access_url}
              {d.format ? (
                <>
                  {" "}
                  <Meta>
                    (<Terms terms={[d.format]} />)
                  </Meta>
                </>
              ) : null}
              {d.description ? (
                <span className="block">
                  <Meta>{d.description}</Meta>
                </span>
              ) : null}
              <span className="block">
                <Meta>
                  {r.accessUrl}:{" "}
                  <ExternalLink href={d.access_url}>
                    {d.access_url}
                  </ExternalLink>
                </Meta>
              </span>
              {d.applicable_legislation.length > 0 ? (
                <span className="block">
                  <Meta>
                    {r.legislation}: <Terms terms={d.applicable_legislation} />
                  </Meta>
                </span>
              ) : null}
            </span>
          ))}
        </Lines>
      ) : null;
    default:
      return null;
  }
}

function Field({ k, metadata }: { k: FieldKey; metadata: DatasetMetadata }) {
  return (
    <DetailField
      id={`record-${k}`}
      label={fieldLabel(k)}
      long={longFields.has(k)}
    >
      {fieldValue(k, metadata)}
    </DetailField>
  );
}

/** Title or description in every language, shown only when there is more than one. */
function Translations({
  k,
  metadata,
}: {
  k: "title" | "description";
  metadata: DatasetMetadata;
}) {
  const texts = metadata[k] ?? [];
  if (texts.length < 2) return null;
  return (
    <DetailField id={`record-${k}`} label={fieldLabel(k)} long>
      <Lines>
        {texts.map((t) => (
          <span key={`${t.lang}-${t.text}`}>
            {t.text} <Meta>({t.lang})</Meta>
          </span>
        ))}
      </Lines>
    </DetailField>
  );
}

/** Every field of a dataset, grouped for reading. */
export function DatasetRecord({ metadata }: { metadata: DatasetMetadata }) {
  const variables = metadata.variables ?? [];
  const keywords = metadata.keyword ?? [];
  return (
    <>
      <DetailSection
        id="record-section-description"
        title={r.sections.description}
      >
        <Translations k="title" metadata={metadata} />
        <Translations k="description" metadata={metadata} />
        {descriptionFields.map((k) => (
          <Field key={k} k={k} metadata={metadata} />
        ))}
      </DetailSection>

      <DetailSection id="record-section-access" title={r.sections.access}>
        {accessFields.map((k) => (
          <Field key={k} k={k} metadata={metadata} />
        ))}
      </DetailSection>

      {variables.length > 0 ? (
        <DetailSection id="record-variables" title={r.sections.variables}>
          {variables.map((v) => (
            <DetailField key={v.name} label={v.name}>
              {v.definition}{" "}
              <Meta>
                ({v.data_type}
                {v.coding_system ? (
                  <>
                    ;{" "}
                    <ExternalLink href={v.coding_system}>
                      {v.coding_system}
                    </ExternalLink>
                  </>
                ) : null}
                )
              </Meta>
            </DetailField>
          ))}
        </DetailSection>
      ) : null}

      <DetailSection id="record-keyword" title={r.sections.keyword}>
        <DetailField label={fieldLabel("keyword")} labelHidden>
          {keywords.length > 0 ? (
            <span
              data-slot="keywords"
              className="flex flex-wrap gap-3 text-[1rem]"
            >
              {keywords.map((k) => (
                <KeywordPill key={k}>{k}</KeywordPill>
              ))}
            </span>
          ) : null}
        </DetailField>
      </DetailSection>

      {metadata.quantum_label ? (
        <DetailSection id="record-section-quantum" title={r.sections.quantum}>
          <DetailField
            id="record-quantum_label"
            label={fieldLabel("quantum_label")}
          >
            <CodeBlock
              text={metadata.quantum_label}
              label={fieldLabel("quantum_label")}
              formatLabel={r.turtleMediaType}
              codeClassName="max-h-80"
            />
          </DetailField>
        </DetailSection>
      ) : null}
    </>
  );
}
