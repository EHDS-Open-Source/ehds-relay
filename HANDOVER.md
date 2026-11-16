# Handover: phone interface tweaks, step 0 (shared groundwork)

Status: done. Other work packages branch from the last commit of this branch.

## What is in place
- Body line height is 1.6 (`frontend/packages/ui/src/styles.css`).
- Short screens: a Tailwind variant `short` for `(max-height: 500px)`. Use `short:static`, `short:top-auto` and so on to stop pinning.
- `AppHeader` writes its real height to `--header-h` on the root element (ResizeObserver, removed on unmount). It is `sticky top-0` and `short:static`.
- `--sticky-offset` on the root: `var(--header-h, 64px)`, and `0px` on short screens. Something that pins more (the form section strip) sets its own `--sticky-offset: calc(var(--header-h) + <its height>)` on a wrapper, and `0px` again under the same short query. Use `top-[var(--header-h,64px)]` for the strip itself.
- Hit area: `hitArea` (exported from `button.tsx`) is the one technique: the element is `relative` and, on phones, a transparent `::before` at least 44px each way is centred on it. Every Button size has it, the header menu button keeps its 38px look. Reuse `hitArea` on chips, tabs, links, checkboxes; keep neighbouring small controls apart.
- e2e: projects `phone` (390x844) and `landscape` (844x390) run only `e2e/mobile.spec.ts`; the `chromium` project ignores it. The spec has `expectNoOverflow(page, name)` (exported) and the section strip checks on new and edit (phone project only). The strip checks are real tests and are expected to fail until the strip work lands.

## Not done here
No e2e run locally (no dev stack). `make -C frontend check test build` passes.
