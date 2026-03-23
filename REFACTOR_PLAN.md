# Refactor Plan — vue3-easytable

Track progress here. Mark items `[x]` when done.

---

## 🔴 Critical

### 1. Tests — Co-location & Enable All
- [x] Save this plan file
- [x] Fix test utils: convert `tests/unit/util.js` → `tests/utils/index.ts` (TS, `jest.*` → `vi.*`)
- [x] Convert `tests/unit/setup.js` → `tests/utils/setup.ts`
- [x] Convert `tests/unit/constant.js` → `tests/utils/constant.ts`
- [x] Move all spec files from `tests/unit/specs/` → `packages/<name>/__tests__/` (co-located)
  - [x] All 31 spec files moved and converted to TS/TSX
- [x] Fix Vue 3 test-utils issues (`propsData` → `props`, `findAll().exists()` → `.length > 0`, JSDOM checkbox/radio click workarounds)
  - [x] `ve-table-header-sort.spec.tsx` — fixed click target + `.classes()` check
  - [x] `ve-table-header-filter.spec.tsx` — fixed mock reset + checkbox input interaction
  - [x] `ve-table-row-checkbox.spec.ts` — fixed `setValue(true)` on input
  - [x] `ve-table-row-expand.spec.tsx` — fixed `findAll().exists()` + expectation
  - [x] `ve-table-row-radio.spec.ts` — fixed radio input interaction
  - [x] `ve-table-header-filter-custom.spec.tsx` — rewrote tests; fixed dropdown `showDropDown` null ref crash
- [x] Update vitest.config.ts: glob-based include, `@test-utils` alias, enable all tests
- [x] Delete old `tests/unit/` directory (specs moved out)
- [x] Fix dropdown `showDropDown` null ref guard (`packages/ve-dropdown/src/index.tsx:291`)
- [x] **Full suite green: 37 files, 257 tests, 0 failures (12s)**
- [ ] Missing tests to create: `ve-table-row-insert.spec.ts`, `ve-table-clipboard.spec.ts`, `ve-table-autofill.spec.ts`

---

## 🟠 High

### 2. Fix Root `package.json`
- [x] Remove `"main": "index.js"` (workspace root is not a published package)
- [x] Fix `"build:comp": "vite build"` (no vite.config.ts at root — broken script)
- [x] Add `auto-imports.d.ts` and `components.d.ts` to `.gitignore`

### 3. Migrate Docs to VitePress
- [x] Create `docs/.vitepress/config.ts` with zh/en i18n and full sidebar (41 ve-table sections)
- [x] Create `docs/.vitepress/plugins/demo.ts` — markdown-it plugin for `:::demo` and `:::anchor` blocks
- [x] Create `docs/.vitepress/theme/` — DemoBlock.vue (runtime compilation via `@vue/compiler-dom`) + theme registration
- [x] Create `docs/zh/` — 55 pages using `<!--@include:-->` to pull in existing source .md files
- [x] Create `docs/en/index.md` stub + `docs/index.md` home redirect
- [x] Update `docs/package.json` — VitePress deps only (removed Element Plus, Prism, lz-string, etc.)
- [x] Update `deploy-docs.yml` — install from workspace root, build with `pnpm docs:build`, deploy `docs/.vitepress/dist`
- [x] Build verified: `vitepress build` succeeds in 4-9s, 55 pages rendered
- [ ] Delete `docs/src/` (old Vite SPA — keep until confirmed new docs are complete)
- [ ] Delete `docs/build/md-loader/` (custom MD→SFC converter)
- [ ] Migrate `docs/src/docs/en/` pages (currently stub only)

---

## 🟡 Medium

### 4. Consolidate Build Pipeline
- [x] Replace `packages/vue/gulpfile.js` with plain Node script (`build/postbuild.js`) — removes `gulp` dep
- [x] Remove dead `lib` config from `packages/vue/vite.config.ts`
- [ ] Replace raw `lessc` CLI call (`build:css`) with Vite CSS plugin
- [ ] Replace raw `tsc` call (`build:lang`) with Vite build output

### 5. Merge Redundant Packages
- [ ] *(revised)* `packages/font/` stays at root level — both `theme-default` and `theme-dark` import it via `../font/iconfont.css`, moving it inside either theme would break the other
- [ ] *(revised)* `packages/style/` stays separate — it is copied to `libs/packages/style/` for users who import raw LESS for customization; merging into theme-default would break that public API

---

## 🟢 Low / Hygiene

### 6. Delete Dead Code
- [x] — *(plan file created)*
- [x] Delete `packages/ve-table/src/util/store.js` (100% commented-out)
- [x] Delete `docs/vite.config.ts.js` (duplicate generated artifact)
- [x] Clean commented-out code in `packages/vue/src/index.ts`
- [x] Remove dead `lib` config in `packages/vue/vite.config.ts`

### 7. Align Package Versions
- [x] Align all `packages/*/package.json` versions (currently `common`=`1.0.0`, `vue`=`0.0.5`)
- [x] Standardize `exports` + `types` fields across all package.json files
