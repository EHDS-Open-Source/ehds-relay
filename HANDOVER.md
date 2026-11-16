# Handover: transfer ownership dialog (frontend)

Status: implemented, frontend checks and tests pass; ready for testing.

Done
- Owner clicking Remove on their own row opens a "{Name} is the owner" pop-up (new owner dropdown, Transfer ownership button). Close-only variant when nobody can take over.
- Success toasts, refetches members and refreshes the session. 403/404/409 messages shown in the pop-up; 403 also refreshes the session.
- Other rows (Standard or co-owner) keep the remove confirmation.
- Files: frontend/packages/web/src/members/{TransferOwnershipDialog.tsx,queries.ts,errors.ts,MembersSection.tsx}, shell/messages.ts, pages/MembersPage.test.tsx.

Next
- `make -C frontend check && cd frontend && pnpm exec vitest run`
- Backend `make check` was not run: no backend venv in this worktree (no backend changes).
- Manual: sign in as an owner with one standard member, remove yourself, transfer.
