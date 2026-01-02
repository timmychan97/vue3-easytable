# Contributing to @easytable/vue

Thank you for your interest in contributing to @easytable/vue! This guide will help you get started with development on macOS, Windows, and Linux.

## Prerequisites

### Required Software

1. **pnpm** - Version 10.0.0 or higher (required)
   ```bash
   npm install -g pnpm@latest
   ```

2. **Node.js** - Version 20.x is automatically managed by pnpm
   - pnpm will automatically download and use the correct Node.js version via `.npmrc` configuration
   - No need to manually install or manage Node.js versions

### How Node Version Management Works

This project uses pnpm's built-in `use-node-version` feature (configured in `.npmrc`) to automatically manage the Node.js version. When you run any pnpm command, it will:

1. Automatically download the specified Node.js version (if not already cached)
2. Use that version for all commands in this project
3. Work independently of any globally installed Node.js version

**No additional setup required** - just install pnpm and run `pnpm install`!

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/kohaiy/easytable.git
cd easytable
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for the monorepo workspace.

### 3. Development

#### Run Documentation Site
```bash
pnpm docs
```
Visit `http://localhost:5173` to see the documentation.

#### Build Components
```bash
pnpm build:comp
```

#### Run Tests
```bash
# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:ci
```

#### Linting
```bash
# Check for errors
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

#### Type Checking
```bash
pnpm typecheck
```

### 4. Build the Package

To build the publishable package:

```bash
cd packages/vue
pnpm build
```

This will:
- Clean previous builds
- Build with Vite (ES, UMD, CJS)
- Compile CSS from LESS
- Generate TypeScript declarations
- Copy necessary files

## Project Structure

```
easytable/
├── .github/              # GitHub workflows and configurations
├── docs/                 # Documentation site (Vite + Vue)
├── packages/             # Monorepo packages
│   ├── common/          # Shared utilities
│   ├── font/            # Icon fonts
│   ├── style/           # Base styles
│   ├── theme-default/   # Default theme
│   ├── theme-dark/      # Dark theme
│   ├── ve-*/            # Individual components
│   └── vue/             # Main package
├── tests/               # Unit tests
├── .editorconfig        # Editor configuration
├── .npmrc              # pnpm config with automatic Node version switching
└── pnpm-workspace.yaml # pnpm workspace configuration
```

## Development Workflow

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run tests and linting:
   ```bash
   pnpm lint:fix
   pnpm test
   pnpm typecheck
   ```

4. Commit your changes (follows conventional commits):
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Commit types:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes (formatting, etc.)
   - `refactor`: Code refactoring
   - `test`: Test changes
   - `chore`: Build process or auxiliary tool changes

5. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

## Working with Individual Packages

Each package can be worked on independently:

```bash
# Navigate to a specific package
cd packages/ve-table

# Install dependencies (if needed)
pnpm install

# Run package-specific scripts
pnpm build
```

## Common Issues

### Windows-Specific Issues

1. **Line Ending Issues**: Ensure Git is configured properly:
   ```cmd
   git config --global core.autocrlf true
   ```

2. **Long Path Issues**: Enable long paths in Git:
   ```cmd
   git config --global core.longpaths true
   ```

3. **Permission Issues**: Run terminal as Administrator if needed.

### macOS-Specific Issues

1. **Xcode Command Line Tools**: Some packages may require:
   ```bash
   xcode-select --install
   ```

### Linux-Specific Issues

1. **Build Tools**: Install build essentials:
   ```bash
   # Debian/Ubuntu
   sudo apt-get install build-essential

   # Fedora
   sudo dnf install gcc-c++ make

   # Arch
   sudo pacman -S base-devel
   ```

## Clean Installation

If you encounter issues with dependencies:

```bash
# Clean everything
pnpm clean:deps

# Reinstall
pnpm install
```

## IDE Setup

### VS Code (Recommended)

1. Install recommended extensions:
   - Vue Language Features (Volar)
   - ESLint
   - EditorConfig for VS Code

2. The workspace settings are pre-configured in `.vscode/settings.json`

### WebStorm

1. Enable Vue.js plugin
2. Import code style from `.editorconfig`
3. Enable ESLint integration

## Testing

### Unit Tests

Tests are located in `tests/unit/specs/`. We use Vitest for testing.

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test ve-table

# Run with coverage
pnpm test --coverage
```

### Writing Tests

Example test structure:

```javascript
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VeTable from '@/ve-table'

describe('VeTable', () => {
  it('renders properly', () => {
    const wrapper = mount(VeTable, {
      props: { /* ... */ }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
```

## Documentation

To update documentation:

1. Navigate to `docs/src/docs/`
2. Edit or add markdown files
3. Run `pnpm docs` to preview changes
4. Build with `pnpm docs:build`

## Release Process

> Note: Only maintainers can publish releases.

1. Update version in `packages/vue/package.json`
2. Update CHANGELOG
3. Build and test:
   ```bash
   cd packages/vue
   pnpm build
   ```
4. Publish:
   ```bash
   pnpm publish
   ```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/kohaiy/easytable/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kohaiy/easytable/discussions)
- **Documentation**: [Official Docs](https://easytable.kohai.top/)

## Code of Conduct

Please be respectful and constructive in all interactions. We're here to build great software together!

## License

By contributing to @easytable/vue, you agree that your contributions will be licensed under its MIT License.
