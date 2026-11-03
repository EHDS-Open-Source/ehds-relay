# Handover: dataset metadata → Health DCAT-AP (Turtle, JSON-LD, RDF/XML)

This branch is stacked on the metadata-to-Turtle branch (`T-013-map-datasets-to-health-dcat-ap-turtle`).
Its pull request should target that branch and say it includes that branch's changes until it merges.

Temporary file for picking up this branch; removed before merge.

## Status
Done and verified: `make check` clean, dataset/rdf tests pass, and both golden examples conform to
the release 8 SHACL shapes (public shapes for the minimal one, non-public for the full one).

## Done
- `rdflib` added (pyproject + pip-compile locks).
- Metadata reshaped to the EU minimum metadata fields (`relay/dtos/dataset_metadata.py`):
  vocabulary fields are label + URI terms, title/description are multilingual, organisations
  carry a type and contact point, variables are a flat list, the QUANTUM label is stored as
  Turtle, access rights is an enum mapped to the EU authority table on export. Dataset API and
  `tests/test_datasets.py` updated for the new shape.
- `relay/rdf/`: `vocab.py` (namespaces, release 8 names), `mapping.py` (declarative field →
  property table, one graph per dataset), `serialise.py` (Turtle).
- Golden examples in `tests/golden/` (`public_minimal`, `non_public_full`: JSON in, Turtle
  expected) and `tests/test_rdf.py` comparing graphs by isomorphism, not strings.
- `tests/test_dataset_metadata.py`: validation rules (e.g. variables required only for
  structured data, English title preferred for display).

## JSON-LD and RDF/XML
- `relay/rdf/serialise.py` adds `to_jsonld` and `to_rdfxml` plus `JSONLD_MEDIA_TYPE` and
  `RDFXML_MEDIA_TYPE`, all exported from `relay.rdf`. They wrap rdflib's built-in serialisers;
  no new dependency.
- JSON-LD is flat (`@graph`, blank-node ids) with an inline `@context` built from `vocab.PREFIXES`.
  No framing and no remote context.
- RDF/XML uses `pretty-xml`. Its text declares UTF-8, so an HTTP route must encode it as UTF-8.
- Blank-node ids are random, so tests parse every format back and compare graphs with the golden
  Turtle (golden examples, a two-dataset catalogue, an empty draft). No new golden files.
- No HTTP route; the export route (format choice) still belongs to the export work.

## Next
1. Don't wire the HTTP export route here: `relay/api/export.py` holds 501 stubs that the
   validation/export work replaces (it should call `relay.rdf`).
2. `AccessRights` stays in `relay/dtos/dataset.py` under that name.
3. The form must collect the health data access body for every dataset, public ones included
   (the public shapes require exactly one `healthdcatap:hdab` with a contact point).

## SHACL check (one-off, not in the project)
pyshacl run from a scratch venv against the release 8 public / restricted / non-public shapes.
The upstream non-public and public shapes contain one property shape without a path (the
hasStructuredData rule); the check script moves it up to its parent shape because pyshacl
rejects it. No other changes to the shapes.

## Guessed properties (no exact spec property)
- Every dataset gets `dcat:theme` = EU data theme HEAL (fixed, the form has no field): the
  shapes require at least one theme and the vocabulary shape requires HEAL.
- Health data access body is now required to publish at every access level (was: non-public only).
- Personal data yes/no: release 8 has no boolean; "yes" is one blank `dpv:PersonalData`, "no" is omitted.
- Organisation contact name: `rdfs:label` on `cv:ContactPoint`.
- Variables group/table titles: derived from the dataset title.
- Term labels: `skos:prefLabel` for concepts, `rdfs:label` otherwise.

## Verify
- `pytest backend/tests/test_rdf.py backend/tests/test_dataset_metadata.py` (no docker needed).
- Full: `make check && make test`.
