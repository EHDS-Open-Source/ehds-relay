# Handover: dataset metadata → Health DCAT-AP (Turtle)

Temporary file for picking up this branch; removed before merge.

## Status
Core work done and verified: `make check` clean, `make test` 61 passed. Remaining: one-off
SHACL check of the full golden example (release 8 shapes could not be downloaded here).

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

## Next
1. One-off pyshacl run of `tests/golden/non_public_full.ttl` against the release 8 shapes
   (public/restricted/non-public) from a scratch venv; fix mapping gaps if any.
2. Don't wire the HTTP export route here: `relay/api/export.py` holds 501 stubs that the
   validation/export work replaces (it should call `relay.rdf`).
3. `AccessRights` stays in `relay/dtos/dataset.py` under that name.

## Guessed properties (no exact spec property)
- Personal data yes/no: release 8 has no boolean; "yes" is one blank `dpv:PersonalData`, "no" is omitted.
- Organisation contact name: `rdfs:label` on `cv:ContactPoint`.
- Variables group/table titles: derived from the dataset title.
- Term labels: `skos:prefLabel` for concepts, `rdfs:label` otherwise.

## Verify
- `pytest backend/tests/test_rdf.py backend/tests/test_dataset_metadata.py` (no docker needed).
- Full: `make check && make test`.
