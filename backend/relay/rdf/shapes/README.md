# Health DCAT-AP release 8 SHACL shapes

Copies of the official Health DCAT-AP release 8 validator files, kept here so validation
and tests never need the network.

Source: <https://data.health.europa.eu/healthdcat-ap/releases/release-8/html/shacl/HealthDCAT-AP_validator/config/rdf-validator/ehds/>
(downloaded 2026-11-03).

| File here | Source path | SHA-256 of the downloaded file |
|---|---|---|
| `public-shapes.ttl` | `shapes/public-shapes.ttl` | `64865de17c1e02995faafc5277b6879aad09ee65e9779b3ed6c5af63b8b17a48` |
| `restricted-shapes.ttl` | `shapes/restricted-shapes.ttl` | `f3bb4d39502d46229eeb7d3de87741e02bc5bd8384a8ce46a78e00c26b109e19` |
| `non-public-shapes.ttl` | `shapes/non-public-shapes.ttl` | `a3a437940302d3915042b986b0885c73f56f16ea2f6af66920e3cc13454adf75` |
| `range.ttl` | `ranges/range.ttl` | `819e118441efaf0221a090ac080e92735112239bf88a2acb08b9e8361711418a` |
| `imports.ttl` | `imports/imports.ttl` | `6c4668174bfb0f7993eb26ea2f316666065365546be64deef8c5653b0958e96e` |
| `mdr_imports.ttl` | `imports/mdr_imports.ttl` | `e77d238fa25a8b97495e835e9a592a023bfaa7b41e4657ff63714f4772f683f3` |

## How they are used

A dataset is checked against one shape file, picked by its access level (public,
restricted or non-public), together with `range.ttl`. `owl:imports` are not followed and
no inference is run. `imports.ttl` and `mdr_imports.ttl` only list external ontologies and
EU vocabularies to import from the network; they are kept for reference and not loaded.
The shape files also import the generic DCAT-AP 3.0.0 shapes from the network; those are
not loaded either.

## Local edit

The three shape files contain one rule (if `healthdcatap:hasStructuredData` is true, the
dataset needs at least one `healthdcatap:hasVariables`) written as a property shape with
an `sh:or` but no `sh:path`. SHACL requires a path on a property shape, so validators
reject the file. In each copy the rule's `sh:or`, `sh:severity` and `sh:message` were
moved up onto the dataset node shape (`:Dataset_Shape`), where they mean the same thing.
The edited spot is marked with a comment. Nothing else was changed.
