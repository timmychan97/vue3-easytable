# Migration Guide

- **Library users:** [Locale message keys renamed](#locale-message-keys-renamed-breaking-change-deprecated-aliases), [Language per app](#language-per-app-usevetable-locale--no-longer-changes-the-global-language), [Norwegian language pack renamed](#norwegian-language-pack-renamed-no-nb--nb-no), [Clipboard respects `editOption`](#clipboard-respects-editoption-paste-cut-and-delete-skip-non-editable-columns)
- **Contributors:** [Development setup improvements](#migration-guide-development-setup-improvements)

## Locale message keys renamed (breaking change, deprecated aliases)

**What changed:** the keys of every language pack were renamed from English to Chinese. For example, `pagination.goto` became `分页.前往` and `table.cut` became `表格.剪切`. Some English texts changed at the same time, for example `confirmFilter` "Confirm" → `确认筛选` "Filter", and "Remove $1 row" → "Delete $1 row(s)".

**Impact:** custom language packs and `VeLocale.update(...)` calls written with the English keys no longer match the keys the components read.

**Deprecation:** `VeLocale.use(...)`, `VeLocale.update(...)` and `useVeTable({ locale })` still accept the English keys. They map each one to its new key and log a `console.warn` the first time each old key is used, naming the old and the new key. If an object has both the old and the new key for the same message, the new key wins. The English keys will be removed in a future version.

**What to do:** rename your keys. The full old → new table is in the docs under *Internationalization → Migrating from the English Keys* (`docs/src/docs/en/locale.md`).

```javascript
// Before (deprecated, still works with a warning)
VeLocale.update({ pagination: { goto: 'Go to' } })

// After
VeLocale.update({ 分页: { 前往: 'Go to' } })
```

**Types:** `LocaleMessage` now describes the exact shape (`分页` and `表格` with their keys), and every built-in language pack is checked against it with `satisfies`. A missing or unknown key is a type error. User input is typed as `LocaleMessageInput`: any subset of the new keys, plus the deprecated English keys, which are marked `@deprecated`.

## Language per app: `useVeTable({ locale })` no longer changes the global language

**What changed:** each app now has its own language. `useVeTable({ locale })` sets the language of that app only, and `this.$veLocale` in a component changes only the language of the component's app. Before, both changed one global language shared by every app, so a second app's `useVeTable({ locale })` switched the language of the first app.

**Unchanged:** the imported `VeLocale.use(...)` / `VeLocale.update(...)` are still global and apply to every app, on top of each app's own language. With a single app, everything renders as before. `VeConfigProvider` still sets the language of its children, on top of the app's language. `use` / `update` no longer modify the object returned by an earlier `getMessage()` call: each call produces a new object.

**What to do:** only if you read the language with the imported `VeLocale.getMessage()` after installing with `useVeTable({ locale })`: it now returns the global language, not the app's. Use `this.$veLocale.getMessage()` in a component of that app instead, or call `VeLocale.use(locale)` if you really want a global language.

## Norwegian language pack renamed: `no-NB` → `nb-NO`

**What changed:** the Norwegian Bokmål language pack is now `lang/nb-NO`, the BCP 47 tag for Norwegian Bokmål. `lang/no-NB` still exists as a deprecated alias that re-exports `nb-NO`, and will be removed in a future version.

**What to do:** change the import path.

```javascript
// Before (deprecated, still works)
import noNB from '@vue3-easytable/vue/libs/locale/lang/no-NB'

// After
import nbNO from '@vue3-easytable/vue/libs/locale/lang/nb-NO'
```

## Clipboard respects `editOption`: paste, cut and delete skip non-editable columns

**What changed:** when the table has an `editOption`, paste, cut and delete (including the context menu "Cut" and the "empty" actions) only write to columns with `edit: true`. A column without `edit: true` can't be edited by typing, and now can't be changed through the clipboard either. For every cell whose value changes, `editOption.beforeCellValueChange`, `cellValueChange` and `afterCellValueChange` are called with the same `{ row, column, changeValue }` as cell editing. A `beforeCellValueChange` that returns `false` (or throws) skips that cell only. Cells whose value doesn't change (`===`) don't trigger the callbacks.

**Order:** `beforePaste` / `beforeCut` / `beforeDelete` → per cell: `beforeCellValueChange`, then the write → per written cell: `cellValueChange`, `afterCellValueChange` → `afterPaste` / `afterCut` / `afterDelete`. With `editOption`, the `data` passed to `beforePaste` / `afterPaste` no longer contains the non-editable columns. Cut still copies the whole selection, including non-editable cells.

**Unchanged:** without `editOption`, every data column is written as before and the cell value callbacks are not called. Copy is not affected.

**What to do:**

- If users should paste into a column, mark it `edit: true` (this also allows editing it by typing).
- If your `beforeCellValueChange` / `afterCellValueChange` assume they only run for typed edits (for example, they focus the edited cell or show a toast), check how they behave for a paste into many cells. Each changed cell gets its own call.
- If you validated or saved clipboard changes in `afterPaste` / `afterCut` / `afterDelete`, you can now do it in `afterCellValueChange` instead. Keep only one of the two, or each change is handled twice.

---

# Migration Guide: Development Setup Improvements

This guide helps existing contributors migrate to the improved cross-platform development setup.

## 📋 What Changed?

We've modernized the development environment to work seamlessly across macOS, Windows, and Linux. Key improvements include:

1. ✅ Node.js version management with pnpm (via `.npmrc`)
2. ✅ Cross-platform build tools (`rimraf`, `npm-run-all2`)
3. ✅ Consistent code formatting with `.editorconfig`
4. ✅ Enhanced `.gitignore` for all platforms
5. ✅ VS Code workspace configuration
6. ✅ Comprehensive contributing guide
7. ✅ Multi-platform CI/CD testing

## 🔄 Migration Steps

### Step 1: Install pnpm

The project requires **pnpm 10.x** which handles Node.js version management automatically.

```bash
npm install -g pnpm@latest
```

> **Note:** pnpm will automatically download and use the correct Node.js version (20.x) when you run any pnpm command in this project. This is configured via `.npmrc` with the `use-node-version` setting. No manual Node.js installation or version management is required!

### Step 2: Clean Install Dependencies

Remove old dependencies and reinstall with new tools:

```bash
# Clean everything
pnpm clean:deps

# Or manually:
# rm -rf node_modules packages/*/node_modules docs/node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### Step 3: Install VS Code Extensions (If using VS Code)

The workspace now recommends helpful extensions. VS Code should prompt you to install them automatically, or run:

1. Open VS Code
2. Press `Cmd/Ctrl + Shift + P`
3. Type "Extensions: Show Recommended Extensions"
4. Install all recommended extensions

Recommended extensions:
- Vue.volar
- dbaeumer.vscode-eslint
- editorconfig.editorconfig
- lokalise.i18n-ally
- antfu.iconify

### Step 4: Verify Setup

```bash
# Check Node version
node --version
# Should show v20.x.x

# Check pnpm version
pnpm --version
# Should show 10.x.x or higher

# Install and build
pnpm install
pnpm build:comp

# Run tests
pnpm test:ci

# Type check
pnpm typecheck
```

## 🆕 New Commands

### Root Package Scripts

**New:**
- `pnpm clean` - Remove all build artifacts
- `pnpm clean:deps` - Remove all dependencies (for clean reinstall)
- `pnpm test:ci` - Run tests once (for CI/CD)
- `pnpm typecheck` - Type check all TypeScript files

**Updated:**
- All commands now work cross-platform (Windows, macOS, Linux)

### Package Build Scripts (packages/vue)

**New:**
- `pnpm clean` - Remove libs directory

**Updated:**
- `pnpm build` - Now uses `npm-run-all` for better orchestration

## 🔍 What to Watch For

### Git Line Endings (Windows)

If you're on Windows and haven't configured Git line endings:

```cmd
git config --global core.autocrlf true
```

Then refresh your checkout:

```bash
# Commit any changes first!
git rm -rf --cached .
git reset --hard HEAD
```

### EditorConfig

Your editor should now automatically:
- Use 2-space indentation
- Use LF line endings
- Trim trailing whitespace

If not, ensure you have the EditorConfig plugin installed.

### Old Build Artifacts

Clean up old build artifacts that might cause conflicts:

```bash
pnpm clean
```

## 🐛 Common Issues

### Issue: "Error: Engine pnpm is incompatible"

**Solution:** Update pnpm to latest version
```bash
npm install -g pnpm@latest
```

### Issue: "Error: Engine node is incompatible"

**Solution:** pnpm should automatically handle the Node.js version. Try:
```bash
pnpm install
```
If the issue persists, ensure you have pnpm 10.x or higher installed:
```bash
npm install -g pnpm@latest
```

### Issue: Build fails on Windows with "rm: command not found"

**Solution:** This should be fixed! Make sure you've run:
```bash
pnpm clean:deps
pnpm install
```

The new `rimraf` package handles cross-platform file deletion.

### Issue: Tests failing after migration

**Solution:** Clean reinstall
```bash
pnpm clean:deps
pnpm install
pnpm clean
pnpm build:comp
pnpm test:ci
```

### Issue: ESLint not working in editor

**Solution:** 
1. Ensure VS Code ESLint extension is installed
2. Reload VS Code window (Cmd/Ctrl + Shift + P → "Reload Window")
3. Check `.vscode/settings.json` is not overridden by user settings

## 📝 Script Migration Reference

### Before → After

| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `pnpm test` | `pnpm test` | Same, but also have `pnpm test:ci` |
| Manual cleanup | `pnpm clean` | New unified clean command |
| Manual dep removal | `pnpm clean:deps` | New command for full reset |
| No type checking | `pnpm typecheck` | New command for TS checking |

### packages/vue Scripts

| Old | New | Notes |
|-----|-----|-------|
| `pnpm build:vite && pnpm build:css && ...` | `pnpm build` | Now uses `npm-run-all` |
| Manual `rm -rf libs` | `pnpm clean` | Cross-platform |

## 🎯 VS Code Tasks

New keyboard shortcuts available:

- `Cmd/Ctrl + Shift + B` - Run default build task
- `Cmd/Ctrl + Shift + P` → "Run Task" - See all available tasks

Available tasks:
- Install Dependencies
- Dev: Documentation
- Build: Components
- Build: Package
- Test: All
- Test: CI
- Lint: Check
- Lint: Fix
- Type Check
- Clean

## 📚 New Documentation

New files to read:
- `CONTRIBUTING.md` - Comprehensive contributor guide
- `DEVELOPMENT.md` - Development setup details
- `MIGRATION.md` - This file

## 🤔 Questions?

If you encounter issues not covered here:

1. Check `CONTRIBUTING.md` for platform-specific troubleshooting
2. Open an issue on GitHub
3. Check existing GitHub issues

## ✅ Verification Checklist

After migration, verify everything works:

- [ ] Node.js version is 20.x (`node --version`)
- [ ] pnpm version is 10.x or higher (`pnpm --version`)
- [ ] Dependencies install without errors (`pnpm install`)
- [ ] Documentation dev server runs (`pnpm docs`)
- [ ] Tests pass (`pnpm test:ci`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Package builds successfully (`cd packages/vue && pnpm build`)
- [ ] VS Code extensions installed (if using VS Code)
- [ ] EditorConfig working (check indentation in new files)

## 🎉 Benefits You'll Notice

After migration, you'll enjoy:

- ✅ Consistent Node.js version across team
- ✅ Faster builds with optimized scripts
- ✅ No more Windows-specific build issues
- ✅ Better editor integration
- ✅ Cleaner git status
- ✅ VS Code tasks for common operations
- ✅ Multi-platform CI ensuring compatibility
- ✅ Type checking integrated into workflow

---

**Last Updated:** December 2025
