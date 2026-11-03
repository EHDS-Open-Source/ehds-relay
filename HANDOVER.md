# Handover: SHACL validation and catalogue export

Temporary file for picking up this branch; delete it before merging.

## What this branch does
- Vendors the official Health DCAT-AP release 8 SHACL files in `backend/relay/rdf/shapes/`
  (README there: source URL, checksums, and the one edit needed for them to load).
- `backend/relay/rdf/validate.py` checks a dataset graph against the shape set for its access level
  (public, restricted, non-public), offline, and turns each result into a plain sentence tied to a
  form field.
- Routes in `backend/relay/api/export.py`:
  - `GET .../datasets/{id}/export?format=ttl|jsonld|rdfxml`: the record as a file (`Content-Type`
    per format, `Content-Disposition` with a file name made from the title). Incomplete records get
    422; a complete draft can be exported. Export does not run the checks.
  - `POST .../datasets/{id}/validate`: `{conforms, missing, violations[{path, field, message,
    severity}]}`. `field` is new (form field key, may be null).
  - `GET .../catalogue/export?format=`: one `dcat:Catalog` with the organisation's published datasets.
- The QUANTUM label (stored as Turtle) is merged into the dataset graph, so it appears in every export.
- Dataset IRIs are the record page URLs of the web app (`{web_url}/orgs/{org}/datasets/{id}`).

## Status
Done. The dataset output page shows an "Official checks" panel above the format tabs
(`frontend/packages/web/src/datasets/ValidationPanel.tsx`): "Passes the official checks", or a list
of problems, each linking to its field in the edit form. A 501 shows "not available yet".
`make check` clean; backend 308 tests and frontend 192 tests pass. `make api_client` is stable.

## Not done
- No catalogue export button in the web app yet (the route works).
- Not tried in Tilt or a browser; only automated tests.

## Things to know
- The public golden example is the Health DCAT-AP minimum. It passes the official checks, but the app
  requires more fields before publishing, so the export route refuses it with 422. Only the full
  golden example is exported over HTTP in tests; both are checked format by format in `test_rdf.py`.
- The shape files import the generic DCAT-AP 3.0.0 shapes and EU vocabularies over the network.
  Those imports are not followed, so only the Health DCAT-AP rules are checked.

## Check it
`make check`; `make -C backend test` (needs docker); `make -C frontend test`.
