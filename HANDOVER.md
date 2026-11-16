# Handover

Status: character counters and length limits are implemented and tested; ready for manual testing.

Done
- `CharacterCount` in the ui package (shown while focused and not empty, always in the last 10% and when over; screen reader line announces only on state change).
- Limits read from the generated schemas in `web/src/datasets/limits.ts`.
- Counters on each title and description entry, provenance and variable definition. Typing and pasting are never blocked.
- Saving an over-limit text sends nothing and shows "Shorten this to N characters or fewer. It's X over."; a server 422 for a too-long string shows the same message.

Checks run
- Frontend: `cd frontend && make lint && make typecheck && make test` pass.
- Not run: backend checks and `make api_client` (no backend venv in this checkout). Run `make install && make check && make api_client && git status` to confirm no diff.

Next
- Try each field in the running app (`make tilt`), including pasting 2,100 characters into the description and a stored title longer than 200.
