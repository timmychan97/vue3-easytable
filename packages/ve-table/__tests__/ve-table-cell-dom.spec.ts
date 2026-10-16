import veTable from '@/ve-table'
import {
  queryBodyRow,
  queryBodyRows,
  queryCell,
  queryFirstRowCell,
  queryLastRowCell,
} from '@/ve-table/src/util/cell-dom'
import { later, mockCellRects, wrapMount as mount } from '@test-utils'

// INFRA-04 / VS-05：按 rowKey / colKey 查找 body 行与单元格
describe('veTable cell dom lookups', () => {
  // 带特殊字符的 key：未转义时 querySelector 会抛出 SyntaxError
  const SPECIAL_ROW_KEY = 'a"b\\c]'
  const SPECIAL_COL_KEY = 'x"y\\z'

  function createTd(colKey: string, text: string) {
    const td = document.createElement('td')
    td.setAttribute('col-key', colKey)
    td.textContent = text
    return td
  }

  function createRow(rowKey: string, colKeys: string[]) {
    const tr = document.createElement('tr')
    tr.className = 've-table-body-tr'
    tr.setAttribute('row-key', rowKey)
    colKeys.forEach(colKey => tr.appendChild(createTd(colKey, `${rowKey}-${colKey}`)))
    return tr
  }

  function createTbody(className = 've-table-body') {
    const tbody = document.createElement('tbody')
    if (className)
      tbody.className = className
    return tbody
  }

  // 普通模式：一个 tbody.ve-table-body 包含所有行（含展开行）
  function createNormalTable() {
    const table = document.createElement('table')
    const tbody = createTbody()
    tbody.appendChild(createRow('1', ['a', SPECIAL_COL_KEY]))
    const expandTr = document.createElement('tr')
    expandTr.className = 've-table-expand-tr'
    // 展开行中嵌套的表格不应被当作本表格的行
    const nestedTable = document.createElement('table')
    const nestedTbody = createTbody()
    nestedTbody.appendChild(createRow('nested', ['a']))
    nestedTable.appendChild(nestedTbody)
    const expandTd = document.createElement('td')
    expandTd.appendChild(nestedTable)
    expandTr.appendChild(expandTd)
    tbody.appendChild(expandTr)
    tbody.appendChild(createRow(SPECIAL_ROW_KEY, ['a', SPECIAL_COL_KEY]))
    tbody.appendChild(createRow('3', ['a', SPECIAL_COL_KEY]))
    table.appendChild(tbody)
    return table
  }

  // 虚拟滚动模式：上下占位 tbody + 每行一个 tbody.ve-table-body
  function createVirtualTable() {
    const table = document.createElement('table')
    const top = createTbody('')
    top.setAttribute('aria-hidden', 'true')
    top.appendChild(document.createElement('tr'))
    table.appendChild(top)
    ;['1', SPECIAL_ROW_KEY, '3'].forEach((rowKey) => {
      const tbody = createTbody()
      tbody.appendChild(createRow(rowKey, ['a', SPECIAL_COL_KEY]))
      table.appendChild(tbody)
    })
    const bottom = createTbody('')
    bottom.setAttribute('aria-hidden', 'true')
    bottom.appendChild(document.createElement('tr'))
    table.appendChild(bottom)
    return table
  }

  describe.each([
    ['normal', createNormalTable],
    ['virtual', createVirtualTable],
  ])('%s body', (_mode, createTable) => {
    it('queryCell finds cells whose keys contain quotes and backslashes', () => {
      const table = createTable()
      expect(queryCell(table, SPECIAL_ROW_KEY, SPECIAL_COL_KEY)?.textContent).toBe(
        `${SPECIAL_ROW_KEY}-${SPECIAL_COL_KEY}`,
      )
      expect(queryCell(table, 3, 'a')?.textContent).toBe('3-a')
    })

    it('queryCell returns null for unknown keys or a missing root', () => {
      const table = createTable()
      expect(queryCell(table, 'missing', 'a')).toBeNull()
      expect(queryCell(table, '1', 'missing')).toBeNull()
      expect(queryCell(null, '1', 'a')).toBeNull()
      expect(queryCell(undefined, '1', 'a')).toBeNull()
    })

    it('queryBodyRow finds the row', () => {
      const table = createTable()
      expect(queryBodyRow(table, SPECIAL_ROW_KEY)?.getAttribute('row-key')).toBe(SPECIAL_ROW_KEY)
      expect(queryBodyRow(table, 'missing')).toBeNull()
      expect(queryBodyRow(null, '1')).toBeNull()
    })

    it('queryBodyRows lists only this table\'s body rows, in order', () => {
      const table = createTable()
      expect(queryBodyRows(table).map(tr => tr.getAttribute('row-key'))).toEqual([
        '1',
        SPECIAL_ROW_KEY,
        '3',
      ])
      expect(queryBodyRows(null)).toEqual([])
    })

    it('queryFirstRowCell / queryLastRowCell use the first and last body row', () => {
      const table = createTable()
      expect(queryFirstRowCell(table, 'a')?.textContent).toBe('1-a')
      expect(queryLastRowCell(table, SPECIAL_COL_KEY)?.textContent).toBe(`3-${SPECIAL_COL_KEY}`)
      expect(queryFirstRowCell(table, 'missing')).toBeNull()
      expect(queryLastRowCell(null, 'a')).toBeNull()
    })
  })

  it('selection and editor work with row keys that contain quotes', async () => {
    // 编辑框只有在单元格有尺寸时才保留 cellEl（jsdom 中默认全为 0）
    const rectSpy = mockCellRects()

    const wrapper = mount(veTable, {
      props: {
        columns: [
          { field: 'name', key: 'a', title: 'Name' },
          { field: 'hobby', key: SPECIAL_COL_KEY, title: 'Hobby', edit: true },
        ],
        tableData: [
          { rowKey: '1', name: 'John', hobby: 'coding' },
          { rowKey: SPECIAL_ROW_KEY, name: 'Dickerson', hobby: 'reading' },
        ],
        rowKeyFieldName: 'rowKey',
        editOption: {
          cellValueChange: () => {},
        },
      },
    })

    await later()

    const tdEl = wrapper.findAll('.ve-table-body-tr')[1].findAll('td')[1]
    await tdEl.trigger('mousedown')
    await later()

    const selection = wrapper.findComponent({ name: 'VeTableSelection' })
    expect((selection.vm as any).currentCellEl).toBe(tdEl.element)

    const editor = wrapper.findComponent({ name: 'VeTableEditInput' })
    expect((editor.vm as any).cellEl).toBe(tdEl.element)

    wrapper.unmount()
    rectSpy.mockRestore()
  })
})
