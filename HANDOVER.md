# Handover: README fixes from a fresh-clone dry run

Status: README and AGENTS.md fixes committed; `make check` passes in this branch. Remove this file before merging.

## Done
- Fresh clone of `mvp-integration` at b69d00f: `make install` (12 s), `make check` (25 s) and `make test`
  (62 s; 452 pytest + 494 vitest) all pass; `make -C frontend build` passes; `make api_client` leaves no diff.
- A second stack ran next to an existing one in the same kind cluster (own namespace, release, cookie name,
  ports +100, `tilt up --port 10351`): all resources green after 65 s. The demo flow (sign in, create
  organisation, invite, email in Mailpit, accept, add dataset, save draft, publish, search and filter, three
  export formats, official checks, catalogue export, member permissions), `make check_password_flows` and
  `scripts/check-keycloak-restart.sh` all passed against it.
- README: what the app does; make and docker memory in prerequisites; `make install` in the quickstart;
  a demo walkthrough for an empty stack; what a second checkout in the same cluster needs; start-over command
  for a changed namespace; cookie name in `.dev.env` for Tilt; invitation example includes the required `name`;
  "Backend" section renamed "Checks and tests". AGENTS.md: one line on side-by-side stacks.

## Next
- Open a PR (branch from `mvp-integration`, PR against `main` as for the other branches).
- Not changed: the date picker has no typed entry (a 2020 start date takes many clicks); `main` still has
  the skeleton README until `mvp-integration` is merged.
