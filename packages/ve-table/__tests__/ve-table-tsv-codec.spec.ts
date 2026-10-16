/*
剪贴板 TSV 编解码单元测试（MOD-04、CLIP-03、CLIP-04）
*/

import {
  decodeSpreadsheetStr,
  encodeToSpreadsheetStr,
} from '@/ve-table/src/util/clipboard/index'

function roundTrip(rows: unknown[][]) {
  return decodeSpreadsheetStr(encodeToSpreadsheetStr(rows))
}

describe('tsv codec: encode', () => {
  it('ends every row with a newline, like Excel', () => {
    expect(encodeToSpreadsheetStr([['a', 'b'], ['c', 'd']])).toBe('a\tb\nc\td\n')
    expect(encodeToSpreadsheetStr([['a']])).toBe('a\n')
  })

  it('encodes nothing as an empty string', () => {
    expect(encodeToSpreadsheetStr([])).toBe('')
  })

  it('writes null and undefined as empty cells and stringifies other values', () => {
    expect(encodeToSpreadsheetStr([[null, undefined, 0, 12.5, false]])).toBe(
      '\t\t0\t12.5\tfalse\n',
    )
  })

  it('quotes values containing a tab, CR, LF or quote and doubles the quotes', () => {
    expect(encodeToSpreadsheetStr([['a\tb']])).toBe('"a\tb"\n')
    expect(encodeToSpreadsheetStr([['a\rb']])).toBe('"a\rb"\n')
    expect(encodeToSpreadsheetStr([['a\nb']])).toBe('"a\nb"\n')
    expect(encodeToSpreadsheetStr([['"a"']])).toBe('"""a"""\n')
    expect(encodeToSpreadsheetStr([['say "hi"']])).toBe('"say ""hi"""\n')
  })
})

describe('tsv codec: decode', () => {
  it('decodes an empty string to no rows', () => {
    expect(decodeSpreadsheetStr('')).toEqual([])
  })

  it('decodes a single value with or without a trailing newline', () => {
    expect(decodeSpreadsheetStr('a')).toEqual([['a']])
    expect(decodeSpreadsheetStr('a\n')).toEqual([['a']])
    expect(decodeSpreadsheetStr('a\r\n')).toEqual([['a']])
  })

  it('treats \\n, \\r\\n and \\r as row separators', () => {
    expect(decodeSpreadsheetStr('a\tb\nc\td')).toEqual([['a', 'b'], ['c', 'd']])
    expect(decodeSpreadsheetStr('a\tb\r\nc\td\r\n')).toEqual([['a', 'b'], ['c', 'd']])
    expect(decodeSpreadsheetStr('a\rb\r')).toEqual([['a'], ['b']])
  })

  it('keeps empty cells, including a trailing one', () => {
    expect(decodeSpreadsheetStr('\tb\t\n')).toEqual([['', 'b', '']])
    expect(decodeSpreadsheetStr('a\t')).toEqual([['a', '']])
  })

  it('keeps an empty last row when the text has one (Excel copy of A1:A2 with A2 empty)', () => {
    expect(decodeSpreadsheetStr('a\n\n')).toEqual([['a'], ['']])
    expect(decodeSpreadsheetStr('\n')).toEqual([['']])
  })

  it('returns ragged rows as they are', () => {
    expect(decodeSpreadsheetStr('a\nb\tc\n')).toEqual([['a'], ['b', 'c']])
  })

  it('unquotes quoted values and collapses doubled quotes', () => {
    expect(decodeSpreadsheetStr('"a\tb"\tc\n')).toEqual([['a\tb', 'c']])
    expect(decodeSpreadsheetStr('"line 1\nline 2"\n')).toEqual([['line 1\nline 2']])
    expect(decodeSpreadsheetStr('"say ""hi"""')).toEqual([['say "hi"']])
    expect(decodeSpreadsheetStr('""\tb')).toEqual([['', 'b']])
  })

  it('keeps quotes inside an unquoted value', () => {
    expect(decodeSpreadsheetStr('12" pipe\tb')).toEqual([['12" pipe', 'b']])
  })

  // CLIP-04
  it('treats an unbalanced leading quote as a literal character', () => {
    expect(decodeSpreadsheetStr('"12 inch\tfoo\nbar')).toEqual([
      ['"12 inch', 'foo'],
      ['bar'],
    ])
  })

  it('treats a leading quote as literal when the closing quote is not followed by a separator', () => {
    expect(decodeSpreadsheetStr('"a" b\tc\n"d"\n')).toEqual([['"a" b', 'c'], ['d']])
  })
})

// CLIP-03
describe('tsv codec: round trip', () => {
  const cases: Array<[string, unknown[][]]> = [
    ['plain values', [['a', 'b'], ['c', 'd']]],
    ['a tab inside a value', [['a\tb', 'c']]],
    ['a CR inside a value', [['a\rb', 'c']]],
    ['a CRLF inside a value', [['a\r\nb']]],
    ['a LF inside a value', [['line 1\nline 2', 'x']]],
    ['quotes inside a value', [['say "hi"', '"']]],
    ['a value wrapped in quotes', [['"a"']]],
    ['a value with a leading quote only', [['"a', 'b']]],
    ['empty trailing cells', [['a', '', '']]],
    ['an empty trailing row', [['a'], ['']]],
    ['an empty first row', [[''], ['a']]],
    ['a single empty cell', [['']]],
    ['only empty cells', [['', ''], ['', '']]],
    ['ragged rows', [['a'], ['b', 'c', 'd']]],
  ]

  it.each(cases)('%s', (_name, rows) => {
    expect(roundTrip(rows)).toEqual(rows)
  })

  it('round-trips null and numbers as strings', () => {
    expect(roundTrip([[null, 1, undefined]])).toEqual([['', '1', '']])
  })
})
