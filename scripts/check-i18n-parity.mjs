#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable node/prefer-global/process */
/**
 * i18n Parity Test Script
 *
 * Validates that all three locales (zh, en, nb) have identical structure:
 * 1. Component locale files: same keys in zh-CN.ts, en-US.ts, no-NB.ts
 * 2. VitePress wrapper pages: same file set in docs/zh/, docs/en/, docs/nb/
 * 3. Source doc fragments: same file set in docs/src/docs/zh/, en/, nb/
 * 4. VitePress config: all locales have matching sidebar entries
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
let errors = 0
let warnings = 0

function error(msg) {
  console.error(`  ERROR: ${msg}`)
  errors++
}

function warn(msg) {
  console.warn(`  WARN: ${msg}`)
  warnings++
}

function ok(msg) {
  console.log(`  OK: ${msg}`)
}

function walkDir(dir) {
  if (!fs.existsSync(dir))
    return []
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath))
    }
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.ts')) {
      files.push(fullPath)
    }
  }
  return files.sort()
}

function getRelativePaths(dir) {
  return walkDir(dir).map(f => path.relative(dir, f)).sort()
}

// ============================================================
// 1. Component locale key parity
// ============================================================
console.log('\n=== 1. Component Locale Key Parity ===\n')

const localeDir = path.join(ROOT, 'packages/common/locale/lang')
const localeFiles = {
  'zh-CN': path.join(localeDir, 'zh-CN.ts'),
  'en-US': path.join(localeDir, 'en-US.ts'),
  'no-NB': path.join(localeDir, 'no-NB.ts'),
}

function extractLocaleKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const keys = new Map()

  // Simple line-by-line parser for TypeScript locale files
  let currentSection = null
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    // Match section headers like "分页: {" or "表格: {"
    const sectionMatch = trimmed.match(/^(\S+)\s*:\s*\{/)
    if (sectionMatch && !trimmed.startsWith('//')) {
      currentSection = sectionMatch[1]
      if (!keys.has(currentSection))
        keys.set(currentSection, [])
      continue
    }
    // Match closing brace (end of section)
    if (trimmed === '},' || trimmed === '}') {
      if (currentSection)
        currentSection = null
      continue
    }
    // Match keys inside a section like "前往: 'Go to',"
    if (currentSection) {
      const keyMatch = trimmed.match(/^(\S+)\s*:/)
      if (keyMatch && !trimmed.startsWith('//')) {
        keys.get(currentSection).push(keyMatch[1])
      }
    }
  }
  // Sort keys for comparison
  for (const [section, sectionKeys] of keys)
    keys.set(section, sectionKeys.sort())

  return keys
}

const allLocaleKeys = {}
for (const [name, filePath] of Object.entries(localeFiles)) {
  if (!fs.existsSync(filePath)) {
    error(`Locale file missing: ${filePath}`)
    continue
  }
  allLocaleKeys[name] = extractLocaleKeys(filePath)
}

// Compare keys across locales
const referenceLocale = 'zh-CN'
const referenceKeys = allLocaleKeys[referenceLocale]
if (referenceKeys) {
  for (const [name, keys] of Object.entries(allLocaleKeys)) {
    if (name === referenceLocale)
      continue

    // Check sections match
    const refSections = [...referenceKeys.keys()].sort()
    const sections = [...keys.keys()].sort()

    if (JSON.stringify(refSections) !== JSON.stringify(sections)) {
      error(`${name}: sections mismatch. Expected [${refSections}], got [${sections}]`)
    }

    // Check keys within each section
    for (const [section, refKeys] of referenceKeys) {
      const localeKeys = keys.get(section) || []
      const missing = refKeys.filter(k => !localeKeys.includes(k))
      const extra = localeKeys.filter(k => !refKeys.includes(k))

      if (missing.length > 0) {
        error(`${name}.${section}: missing keys: ${missing.join(', ')}`)
      }
      if (extra.length > 0) {
        error(`${name}.${section}: extra keys: ${extra.join(', ')}`)
      }
    }
  }
  ok(`Locale key comparison complete`)
}

// ============================================================
// 2. VitePress wrapper page parity
// ============================================================
console.log('\n=== 2. VitePress Wrapper Page Parity ===\n')

const wrapperDirs = {
  zh: path.join(ROOT, 'docs/zh'),
  en: path.join(ROOT, 'docs/en'),
  nb: path.join(ROOT, 'docs/nb'),
}

const wrapperFiles = {}
for (const [locale, dir] of Object.entries(wrapperDirs)) {
  wrapperFiles[locale] = getRelativePaths(dir)
}

const refWrapperFiles = wrapperFiles.zh
for (const [locale, files] of Object.entries(wrapperFiles)) {
  if (locale === 'zh')
    continue

  const missing = refWrapperFiles.filter(f => !files.includes(f))
  const extra = files.filter(f => !refWrapperFiles.includes(f))

  if (missing.length > 0) {
    error(`docs/${locale}/: missing ${missing.length} files: ${missing.join(', ')}`)
  }
  if (extra.length > 0) {
    warn(`docs/${locale}/: ${extra.length} extra files: ${extra.join(', ')}`)
  }
  if (missing.length === 0 && extra.length === 0) {
    ok(`docs/${locale}/ matches docs/zh/ (${files.length} files)`)
  }
}

// ============================================================
// 3. Source doc fragment parity
// ============================================================
console.log('\n=== 3. Source Doc Fragment Parity ===\n')

const srcDocDirs = {
  zh: path.join(ROOT, 'docs/src/docs/zh'),
  en: path.join(ROOT, 'docs/src/docs/en'),
  nb: path.join(ROOT, 'docs/src/docs/nb'),
}

const srcDocFiles = {}
for (const [locale, dir] of Object.entries(srcDocDirs)) {
  srcDocFiles[locale] = getRelativePaths(dir)
}

const refSrcFiles = srcDocFiles.zh
for (const [locale, files] of Object.entries(srcDocFiles)) {
  if (locale === 'zh')
    continue

  const missing = refSrcFiles.filter(f => !files.includes(f))
  const extra = files.filter(f => !refSrcFiles.includes(f))

  if (missing.length > 0) {
    error(`src/docs/${locale}/: missing ${missing.length} files:\n    ${missing.join('\n    ')}`)
  }
  if (extra.length > 0) {
    warn(`src/docs/${locale}/: ${extra.length} extra files: ${extra.join(', ')}`)
  }
  if (missing.length === 0 && extra.length === 0) {
    ok(`src/docs/${locale}/ matches src/docs/zh/ (${files.length} files)`)
  }
}

// ============================================================
// 4. VitePress config sidebar parity
// ============================================================
console.log('\n=== 4. VitePress Config Sidebar Parity ===\n')

const configPath = path.join(ROOT, 'docs/.vitepress/config.ts')
const configContent = fs.readFileSync(configPath, 'utf-8')

// Extract sidebar link counts per locale
function countSidebarLinks(sidebarVarName) {
  const regex = new RegExp(`const ${sidebarVarName}\\s*=\\s*\\[([\\s\\S]*?)^\\]`, 'm')
  const match = configContent.match(regex)
  if (!match)
    return 0
  return (match[1].match(/link:/g) || []).length
}

const zhLinks = countSidebarLinks('zhSidebar')
const enLinks = countSidebarLinks('enSidebar')
const nbLinks = countSidebarLinks('nbSidebar')

if (zhLinks !== enLinks) {
  error(`Sidebar link count mismatch: zh=${zhLinks}, en=${enLinks}`)
}
else {
  ok(`zh and en sidebar link counts match (${zhLinks} links)`)
}

if (zhLinks !== nbLinks) {
  error(`Sidebar link count mismatch: zh=${zhLinks}, nb=${nbLinks}`)
}
else {
  ok(`zh and nb sidebar link counts match (${zhLinks} links)`)
}

// ============================================================
// 5. Check locale file counts match
// ============================================================
console.log('\n=== 5. Locale File Count Summary ===\n')

console.log(`  Component locales: zh-CN, en-US, no-NB`)
console.log(`  Wrapper pages:     zh=${wrapperFiles.zh?.length || 0}, en=${wrapperFiles.en?.length || 0}, nb=${wrapperFiles.nb?.length || 0}`)
console.log(`  Source fragments:  zh=${srcDocFiles.zh?.length || 0}, en=${srcDocFiles.en?.length || 0}, nb=${srcDocFiles.nb?.length || 0}`)

// ============================================================
// Summary
// ============================================================
console.log('\n=== Summary ===\n')
console.log(`  Errors:   ${errors}`)
console.log(`  Warnings: ${warnings}`)

if (errors > 0) {
  console.log('\n  FAILED: Fix the errors above and re-run.')
  process.exit(1)
}
else {
  console.log('\n  PASSED: All i18n parity checks passed!')
  process.exit(0)
}
