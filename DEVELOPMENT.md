# Development Setup Improvements

This document outlines the recent improvements made to enhance cross-platform development experience for macOS, Windows, and Linux.

## 🎯 Changes Made

### 1. Node.js Version Management

**Files Added:**
- `.npmrc` - pnpm configuration with automatic Node.js version switching (20.19.6)

**Benefits:**
- Ensures all developers use the same Node.js version
- Automatic version switching when using pnpm (via `use-node-version` in `.npmrc`)
- No need for external version managers - pnpm handles everything
- Prevents "works on my machine" issues

**Usage:**
```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm@latest

# pnpm will automatically use the correct Node.js version
pnpm install
```

### 2. Cross-Platform Build Tools

**Dependencies Added:**
- `rimraf` - Cross-platform file deletion
- `npm-run-all2` - Run multiple npm scripts in parallel/sequential
- `vue-tsc` - Vue TypeScript type checking

**Package.json Updates:**

Root `package.json`:
```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "clean": "rimraf dist packages/vue/libs docs/dist _build_gh_pages node_modules/.vite",
    "clean:deps": "rimraf node_modules packages/*/node_modules docs/node_modules pnpm-lock.yaml",
    "test:ci": "vitest run",
    "typecheck": "vue-tsc --noEmit"
  }
}
```

`packages/vue/package.json`:
```json
{
  "scripts": {
    "clean": "rimraf libs",
    "build": "npm-run-all clean build:vite build:css build:lang gulp"
  }
}
```

**Benefits:**
- Works reliably on Windows (no more `rm -rf` issues)
- Better build orchestration with `npm-run-all`
- Type checking integrated into workflow

### 3. EditorConfig

**File Added:** `.editorconfig`

**Configuration:**
- UTF-8 character encoding
- LF line endings (consistent across all platforms)
- 2-space indentation for JS/TS/Vue/JSON/YAML
- Automatic whitespace trimming

**Benefits:**
- Consistent code formatting across different editors
- Prevents line ending conflicts between Windows (CRLF) and Unix (LF)
- Works with VS Code, WebStorm, Sublime Text, Vim, etc.

### 4. Enhanced .gitignore

**Improvements:**
- OS-specific files (`.DS_Store`, `Thumbs.db`, etc.)
- IDE files (`.idea`, `.vscode/*` with exclusions)
- Cache directories (`.vite`, `.turbo`, `.eslintcache`)
- Environment files (`.env*`)
- Coverage reports

**Benefits:**
- Cleaner git status across all platforms
- Prevents accidental commits of OS/IDE-specific files
- Better collaboration between developers using different tools

### 5. VS Code Workspace Configuration

**Files Updated/Added:**
- `.vscode/extensions.json` - Recommended extensions
- `.vscode/tasks.json` - Pre-configured build tasks

**Recommended Extensions:**
- Vue.volar - Vue language support
- dbaeumer.vscode-eslint - ESLint integration
- editorconfig.editorconfig - EditorConfig support
- lokalise.i18n-ally - i18n support
- antfu.iconify - Icon preview

**Available Tasks:**
- Install Dependencies
- Dev: Documentation
- Build: Components
- Build: Package (default build)
- Test: All (default test)
- Test: CI
- Lint: Check
- Lint: Fix
- Type Check
- Clean

**Usage:**
- Press `Cmd/Ctrl + Shift + B` to run default build
- Press `Cmd/Ctrl + Shift + P` → "Run Task" to see all tasks

### 6. Contributing Guide

**File Added:** `CONTRIBUTING.md`

**Contents:**
- Platform-specific setup instructions (macOS, Windows, Linux)
- Node.js installation guides
- Development workflow
- Testing guidelines
- Commit conventions
- Common troubleshooting for each platform

### 7. GitHub Actions CI/CD

**Files Added/Updated:**
- `.github/workflows/ci.yml` - Multi-platform testing
- `.github/workflows/deploy-docs.yml` - Updated to use modern actions

**CI Features:**
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
```

**Runs:**
- Linting on Ubuntu
- Tests on all three platforms
- Builds on all three platforms
- Type checking
- Uses pnpm cache for faster builds

**Benefits:**
- Catches platform-specific issues before merge
- Ensures builds work on all target platforms
- Faster CI with dependency caching

## 🚀 Quick Start (Updated)

### Prerequisites

1. **pnpm 10.x** (required - handles Node.js version automatically)

### Setup

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm@latest

# Clone the repository
git clone https://github.com/kohaiy/easytable.git
cd easytable

# Install dependencies (pnpm automatically uses Node.js 20.x via .npmrc)
pnpm install

# Start development server
pnpm docs

# Run tests
pnpm test

# Build package
cd packages/vue
pnpm build
```

### Windows-Specific Notes

1. **Git Line Endings:**
   ```cmd
   git config --global core.autocrlf true
   ```

2. **Long Paths:**
   ```cmd
   git config --global core.longpaths true
   ```

3. **PowerShell Execution Policy** (if needed):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### macOS-Specific Notes

1. **Xcode Command Line Tools** (required for native modules):
   ```bash
   xcode-select --install
   ```

### Linux-Specific Notes

1. **Build Tools:**
   ```bash
   # Debian/Ubuntu
   sudo apt-get install build-essential

   # Fedora
   sudo dnf install gcc-c++ make
   ```

## 📊 Platform Compatibility Matrix

| Feature | macOS | Windows | Linux | Notes |
|---------|-------|---------|-------|-------|
| Install | ✅ | ✅ | ✅ | pnpm install |
| Dev Server | ✅ | ✅ | ✅ | pnpm docs |
| Build | ✅ | ✅ | ✅ | Uses rimraf |
| Tests | ✅ | ✅ | ✅ | Vitest |
| Linting | ✅ | ✅ | ✅ | ESLint |
| Type Check | ✅ | ✅ | ✅ | vue-tsc |

## 🔧 Troubleshooting

### Clean Install

If you encounter dependency issues:

```bash
# Remove all dependencies
pnpm clean:deps

# Reinstall
pnpm install
```

### Build Issues

```bash
# Clean build artifacts
pnpm clean

# Rebuild
cd packages/vue
pnpm build
```

### Platform-Specific Issues

See `CONTRIBUTING.md` for detailed troubleshooting guides for each platform.

## 📝 Scripts Reference

### Root Package

| Script | Description |
|--------|-------------|
| `pnpm docs` | Start documentation dev server |
| `pnpm docs:build` | Build documentation |
| `pnpm lint` | Check for linting errors |
| `pnpm lint:fix` | Auto-fix linting errors |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:ci` | Run tests once (CI) |
| `pnpm typecheck` | Type check all files |
| `pnpm clean` | Remove build artifacts |
| `pnpm clean:deps` | Remove all dependencies |

### Package Build (`packages/vue`)

| Script | Description |
|--------|-------------|
| `pnpm clean` | Remove libs directory |
| `pnpm build` | Full build (clean → vite → css → lang → gulp) |
| `pnpm build:vite` | Vite build only |
| `pnpm build:css` | LESS → CSS compilation |
| `pnpm build:lang` | TypeScript language files |

## 🎨 Code Style

- **Indentation:** 2 spaces
- **Line Endings:** LF (Unix-style)
- **Charset:** UTF-8
- **Linter:** ESLint with @antfu/eslint-config
- **Formatter:** ESLint (Prettier disabled in favor of ESLint)

## 🤝 Contributing

Please read `CONTRIBUTING.md` for detailed information about:
- Development workflow
- Commit conventions
- Testing guidelines
- Platform-specific setup

## 📚 Additional Resources

- [pnpm Documentation](https://pnpm.io/)
- [Vite Documentation](https://vitejs.dev/)
- [Vue 3 Documentation](https://vuejs.org/)
- [EditorConfig](https://editorconfig.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
