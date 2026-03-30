#!/usr/bin/env node
/**
 * Generates VitePress wrapper pages for en/ and nb/ locales
 * by mirroring the zh/ structure with translated titles and
 * updated include paths.
 */
import fs from 'node:fs'
import path from 'node:path'

const DOCS_DIR = path.resolve(import.meta.dirname, '../docs')

// Title translations: Chinese -> { en, nb }
const TITLES = {
  '介绍': { en: 'Introduction', nb: 'Introduksjon' },
  '常见问题': { en: 'FAQ', nb: 'Vanlige spørsmål' },
  '快速开始': { en: 'Quick Start', nb: 'Hurtigstart' },
  '国际化': { en: 'Internationalization', nb: 'Internasjonalisering' },
  '主题定制': { en: 'Theme Customization', nb: 'Tilpasning av tema' },
  'VeCheckbox': { en: 'VeCheckbox', nb: 'VeCheckbox' },
  'VeContextmenu': { en: 'VeContextmenu', nb: 'VeContextmenu' },
  'VeDropdown': { en: 'VeDropdown', nb: 'VeDropdown' },
  'VeIcon': { en: 'VeIcon', nb: 'VeIcon' },
  'VeLoading': { en: 'VeLoading', nb: 'VeLoading' },
  'VeLocale': { en: 'VeLocale', nb: 'VeLocale' },
  'VePagination': { en: 'VePagination', nb: 'VePagination' },
  'VeRadio': { en: 'VeRadio', nb: 'VeRadio' },
  'VeSelect': { en: 'VeSelect', nb: 'VeSelect' },
  'API': { en: 'API', nb: 'API' },
  '使用': { en: 'Usage', nb: 'Bruk' },
  '单元格对齐': { en: 'Cell Alignment', nb: 'Cellejustering' },
  '单元格自动填充': { en: 'Cell Autofill', nb: 'Automatisk utfylling av celler' },
  '单元格自定义': { en: 'Custom Cell', nb: 'Egendefinert celle' },
  '单元格编辑': { en: 'Cell Editing', nb: 'Celleredigering' },
  '单元格省略': { en: 'Cell Ellipsis', nb: 'Celle-ellipse' },
  '单元格选择': { en: 'Cell Selection', nb: 'Cellevalg' },
  '单元格合并': { en: 'Cell Merge', nb: 'Cellesammenslåing' },
  '单元格样式': { en: 'Cell Style', nb: 'Cellestil' },
  '剪贴板': { en: 'Clipboard', nb: 'Utklippstavle' },
  '列固定': { en: 'Fixed Columns', nb: 'Faste kolonner' },
  '列隐藏': { en: 'Hidden Columns', nb: 'Skjulte kolonner' },
  '列宽拖动': { en: 'Column Resize', nb: 'Endre kolonnebredde' },
  '列宽设置': { en: 'Column Width', nb: 'Kolonnebredde' },
  '右键菜单': { en: 'Context Menu', nb: 'Høyreklikkmeny' },
  '空数据': { en: 'Empty Data', nb: 'Tomme data' },
  '事件自定义': { en: 'Custom Events', nb: 'Egendefinerte hendelser' },
  'footer 汇总': { en: 'Footer Summary', nb: 'Bunntekstsammendrag' },
  '筛选自定义': { en: 'Custom Filter', nb: 'Egendefinert filter' },
  '筛选': { en: 'Filter', nb: 'Filtrering' },
  '表头固定': { en: 'Fixed Header', nb: 'Fast topptekst' },
  '表头分组': { en: 'Header Grouping', nb: 'Gruppering av topptekst' },
  '表头隐藏': { en: 'Hidden Header', nb: 'Skjult topptekst' },
  '排序': { en: 'Sorting', nb: 'Sortering' },
  '实例方法': { en: 'Instance Methods', nb: 'Instansmetoder' },
  '开启 loading': { en: 'Loading', nb: 'Laster' },
  '操作列': { en: 'Operation Column', nb: 'Operasjonskolonne' },
  '分页': { en: 'Pagination', nb: 'Paginering' },
  '行多选': { en: 'Row Checkbox', nb: 'Rad-avkrysningsboks' },
  '行展开': { en: 'Row Expand', nb: 'Radutvidelse' },
  '行序号': { en: 'Row Index', nb: 'Radindeks' },
  '行插入': { en: 'Row Insert', nb: 'Radinnsetting' },
  '行单选': { en: 'Row Radio', nb: 'Rad-radioknapp' },
  '行样式': { en: 'Row Style', nb: 'Radstil' },
  '表格边框': { en: 'Table Border', nb: 'Tabellramme' },
  '表格高度': { en: 'Table Height', nb: 'Tabellhøyde' },
  '表格宽度': { en: 'Table Width', nb: 'Tabellbredde' },
  '虚拟滚动': { en: 'Virtual Scrolling', nb: 'Virtuell rulling' },
}

function processFile(zhFilePath, locale) {
  const content = fs.readFileSync(zhFilePath, 'utf-8')
  const relativePath = path.relative(path.join(DOCS_DIR, 'zh'), zhFilePath)
  const targetPath = path.join(DOCS_DIR, locale, relativePath)

  // Extract title from frontmatter
  const titleMatch = content.match(/^---\s*\ntitle:\s*(.+)\s*\n---/)
  if (!titleMatch) {
    console.warn(`No frontmatter in ${zhFilePath}`)
    return
  }

  const zhTitle = titleMatch[1].trim()
  const translations = TITLES[zhTitle]
  if (!translations) {
    console.warn(`No translation for title: "${zhTitle}" in ${zhFilePath}`)
    return
  }

  const newTitle = translations[locale]

  // Replace title and include paths
  let newContent = content
    .replace(/^(---\s*\ntitle:\s*).+(\s*\n---)/, `$1${newTitle}$2`)

  // For files in docs/zh/ root (not ve-table/), includes use ../src/docs/zh/
  // For files in docs/zh/ve-table/, includes use ../../src/docs/zh/
  newContent = newContent.replace(
    /<!--@include:\s*(\.\.\/)+src\/docs\/zh\//g,
    (match, dots) => match.replace('/zh/', `/${locale}/`)
  )

  // For index.md which has inline content, we need special handling
  if (relativePath === 'index.md') {
    newContent = locale === 'en' ? generateEnIndex() : generateNbIndex()
  }

  // Ensure target directory exists
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, newContent, 'utf-8')
  console.log(`Created: ${targetPath}`)
}

function generateEnIndex() {
  return `---
title: Introduction
---

## @vue3-easytable/vue

A table component based on Vue 3.x.

### Features

-   Virtual scrolling technology, supporting display of up to **300,000 rows**
-   **Free forever**. You are also welcome to donate

### Capabilities

**Basic Components**

-   Loading component
-   Pagination component
-   Context menu component
-   Icon component
-   Locale (i18n) component

**Table Component**

-   Internationalization
-   Theme customization
-   Built-in themes
-   Fixed columns
-   Fixed header
-   Header grouping
-   Filtering
-   Sorting
-   Column resize (drag)
-   Cell styling
-   Cell merge
-   Custom cells
-   Cell selection (keyboard)
-   Cell autofill
-   Cell editing
-   Clipboard
-   Context menu
-   Cell ellipsis
-   Row radio (single select)
-   Row checkbox (multi-select)
-   Row expand
-   Row styling
-   Footer summary
-   Pagination
-   Virtual scrolling
-   Custom events

### Browser Support

-   Modern browsers and IE11+

| [<img src="/images/browsers/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>IE / Edge | [<img src="/images/browsers/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Firefox | [<img src="/images/browsers/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome | [<img src="/images/browsers/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Safari | [<img src="/images/browsers/opera_48x48.png" alt="Opera" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Opera |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IE11, Edge                                                                                                                                                      | last 2 versions                                                                                                                                                | last 2 versions                                                                                                                                             | last 2 versions                                                                                                                                             | last 2 versions                                                                                                                                          |

### How to Contribute

If you would like to contribute, [Pull Requests](https://github.com/timmychan97/vue3-easytable/pulls) are welcome.
`
}

function generateNbIndex() {
  return `---
title: Introduksjon
---

## @vue3-easytable/vue

En tabellkomponent basert på Vue 3.x.

### Egenskaper

-   Virtuell rulleteknologi, støtter visning av opptil **300 000 rader**
-   **Gratis for alltid**. Du er også velkommen til å donere

### Funksjonalitet

**Grunnleggende komponenter**

-   Loading-komponent
-   Pagineringskomponent
-   Høyreklikkmenykomponent
-   Ikonkomponent
-   Lokaliserings- (i18n) komponent

**Tabellkomponent**

-   Internasjonalisering
-   Tilpasning av tema
-   Innebygde temaer
-   Faste kolonner
-   Fast topptekst
-   Gruppering av topptekst
-   Filtrering
-   Sortering
-   Endre kolonnebredde (dra)
-   Cellestil
-   Cellesammenslåing
-   Egendefinerte celler
-   Cellevalg (tastatur)
-   Automatisk utfylling av celler
-   Celleredigering
-   Utklippstavle
-   Høyreklikkmeny
-   Celle-ellipse
-   Rad-radioknapp (enkeltvalg)
-   Rad-avkrysningsboks (flervalg)
-   Radutvidelse
-   Radstil
-   Bunntekstsammendrag
-   Paginering
-   Virtuell rulling
-   Egendefinerte hendelser

### Nettleserstøtte

-   Moderne nettlesere og IE11+

| [<img src="/images/browsers/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>IE / Edge | [<img src="/images/browsers/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Firefox | [<img src="/images/browsers/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome | [<img src="/images/browsers/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Safari | [<img src="/images/browsers/opera_48x48.png" alt="Opera" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Opera |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IE11, Edge                                                                                                                                                      | last 2 versions                                                                                                                                                | last 2 versions                                                                                                                                             | last 2 versions                                                                                                                                             | last 2 versions                                                                                                                                          |

### Hvordan bidra

Hvis du ønsker å bidra, er [Pull Requests](https://github.com/timmychan97/vue3-easytable/pulls) velkomne.
`
}

// Main execution
const zhDir = path.join(DOCS_DIR, 'zh')

function walkDir(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath))
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

const zhFiles = walkDir(zhDir)
console.log(`Found ${zhFiles.length} zh files to mirror\n`)

for (const locale of ['en', 'nb']) {
  console.log(`\n=== Generating ${locale} wrapper pages ===\n`)
  for (const zhFile of zhFiles) {
    processFile(zhFile, locale)
  }
}

console.log('\nDone!')
