/**
 * 电子表格 TSV 编解码（MOD-04）
 *
 * 纯函数，与 Excel / Google Sheets 的剪贴板格式保持一致：
 * - 单元格之间用 `\t` 分隔，每一行（包括最后一行）都以换行结尾；
 * - 含有 `\t`、`\r`、`\n` 或 `"` 的值用双引号包裹，值内的 `"` 写成 `""`。
 *
 * 思路参考 http://github.com/warpech/sheetclip/
 */

// 匹配单元格内容的结束位置（分隔符或换行）
const regCellEnd = /[\t\r\n]/
// 需要加引号的值
const regNeedQuote = /[\t\r\n"]/

/**
 * 换行符长度：`\r\n`、`\n\r` 为 2，`\r`、`\n` 为 1，其他为 0
 */
function getNewLineLength(str: string, index: number): number {
  const char = str[index]

  if (char !== '\r' && char !== '\n')
    return 0

  const nextChar = str[index + 1]

  if ((nextChar === '\r' || nextChar === '\n') && nextChar !== char)
    return 2

  return 1
}

/**
 * 从 index 开始查找单元格内容的结束位置
 */
function findCellEnd(str: string, index: number): number {
  const rest = str.slice(index)
  const matched = rest.match(regCellEnd)

  return matched ? index + matched.index! : str.length
}

/**
 * 解析以 `"` 开头的单元格
 * 只有在找到闭合引号、且闭合引号后紧跟分隔符/换行/结尾时才视为带引号的值；
 * 否则返回 null，由调用方把引号当作普通字符处理（CLIP-04）
 */
function parseQuotedCell(
  str: string,
  index: number,
): { value: string, end: number } | null {
  let value = ''
  let cursor = index + 1

  while (cursor < str.length) {
    const quoteIndex = str.indexOf('"', cursor)

    // 没有闭合引号
    if (quoteIndex === -1)
      return null

    value += str.slice(cursor, quoteIndex)

    // `""` 是转义的引号
    if (str[quoteIndex + 1] === '"') {
      value += '"'
      cursor = quoteIndex + 2
      continue
    }

    const end = quoteIndex + 1

    // 闭合引号后必须是分隔符、换行或结尾
    if (end === str.length || regCellEnd.test(str[end]))
      return { value, end }

    return null
  }

  return null
}

/**
 * @decodeSpreadsheetStr
 * @desc 把电子表格文本解码为二维数组（每行的长度可能不同）
 * - 空字符串返回 `[]`
 * - 结尾的换行只表示最后一行结束，不会多出一个空行；
 *   因此 `"a\n\n"`（A1:A2，A2 为空）解码为 `[["a"], [""]]`
 * @param {string} str The string to parse.
 */
export function decodeSpreadsheetStr(str: string): string[][] {
  const rows: string[][] = []

  if (!str)
    return rows

  let row: string[] = []
  let index = 0

  while (true) {
    let cell: string
    const quoted = str[index] === '"' ? parseQuotedCell(str, index) : null

    if (quoted) {
      cell = quoted.value
      index = quoted.end
    }
    else {
      // 普通值，或无法按引号解析的值：原样保留（包括引号）
      const end = findCellEnd(str, index)
      cell = str.slice(index, end)
      index = end
    }

    row.push(cell)

    // 文本结束
    if (index >= str.length) {
      rows.push(row)
      break
    }

    // 下一个单元格
    if (str[index] === '\t') {
      index += 1
      continue
    }

    // 换行：结束当前行
    index += getNewLineLength(str, index)
    rows.push(row)
    row = []

    // 结尾的换行不产生新行
    if (index >= str.length)
      break
  }

  return rows
}

/**
 * 把单个值编码为电子表格单元格文本
 */
function encodeCell(val: unknown): string {
  if (val === null || val === undefined)
    return ''

  const str = String(val)

  if (regNeedQuote.test(str))
    return `"${str.replace(/"/g, '""')}"`

  return str
}

/**
 * @encodeToSpreadsheetStr
 * @desc 把二维数组编码为电子表格文本，每一行都以 `\n` 结尾（与 Excel 一致）
 * @param {Array} arr rows of cell values
 */
export function encodeToSpreadsheetStr(arr: unknown[][]): string {
  return arr.map(row => `${row.map(encodeCell).join('\t')}\n`).join('')
}
