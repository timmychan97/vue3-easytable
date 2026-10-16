const regUniversalNewLine = /^(\r\n|\n\r|\r|\n)/
const regNextCellNoQuotes = /^[^\t\r\n]+/
const regNextEmptyCell = /^\t/

/**
 * @decodeSpreadsheetStr
 * @desc Decode spreadsheet string into array.  refer from http://github.com/warpech/sheetclip/
 * @param {string} str The string to parse.
 */
export function decodeSpreadsheetStr(str: string) {
  let arr = [['']]

  if (str.length === 0)
    return arr

  let column = 0
  let row = 0
  let lastLength

  while (str.length > 0) {
    if (lastLength === str.length) {
      // In the case If in last cycle we didn't match anything, we have to leave the infinite loop
      break
    }

    lastLength = str.length

    if (str.match(regNextEmptyCell)) {
      str = str.replace(regNextEmptyCell, '')

      column += 1
      arr[row][column] = ''
    }
    else if (str.match(regUniversalNewLine)) {
      str = str.replace(regUniversalNewLine, '')
      column = 0
      row += 1

      arr[row] = ['']
    }
    else {
      let nextCell = ''

      if (str.startsWith('"')) {
        let quoteNo = 0
        let isStillCell = true

        while (isStillCell) {
          const nextChar = str.slice(0, 1)

          if (nextChar === '"')
            quoteNo += 1

          nextCell += nextChar

          str = str.slice(1)

          if (
            str.length === 0
            || (str.match(/^[\t\r\n]/) && quoteNo % 2 === 0)
          ) {
            isStillCell = false
          }
        }

        nextCell = nextCell
          .replace(/^"/, '')
          .replace(/"$/, '')
          .replace(/"*/g, match =>
            Array.from({ length: Math.floor(match.length / 2) })
              .fill('"')
              .join(''))
      }
      else {
        const matchedText = str.match(regNextCellNoQuotes)

        nextCell = matchedText ? matchedText[0] : ''
        str = str.slice(nextCell.length)
      }

      arr[row][column] = nextCell
    }
  }
  // 去除 excel 最后一个多余的换行数据
  if (Array.isArray(arr) && arr.length > 1) {
    if (arr[arr.length - 1].length === 1 && arr[arr.length - 1][0] === '')
      arr = arr.slice(0, arr.length - 1)
  }

  return arr
}

/**
 * @decodeSpreadsheetStr
 * @desc encode array to spreadsheet string.  refer from http://github.com/warpech/sheetclip/
 * @param {Array} arr The string to parse.
 */
export function encodeToSpreadsheetStr(arr: any[]): string { // TODO: TS
  let r
  let rLen
  let c
  let cLen
  let str = ''
  let val

  for (r = 0, rLen = arr.length; r < rLen; r += 1) {
    cLen = arr[r].length

    for (c = 0; c < cLen; c += 1) {
      if (c > 0)
        str += '\t'

      val = arr[r][c]

      if (typeof val === 'string') {
        if (val.includes('\n'))
          str += `"${val.replace(/"/g, '""')}"`

        else
          str += val
      }
      else if (val === null || val === undefined) {
        // void 0 resolves to undefined
        str += ''
      }
      else {
        str += val
      }
    }

    if (r !== rLen - 1)
      str += '\n'
  }

  return str
}
