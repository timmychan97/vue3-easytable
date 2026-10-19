/*
行列变化后选区 / 编辑状态的同步（SEL-01）、startEditingCell 覆盖编辑（EDIT-04）、
编辑与自动填充回调抛异常（INFRA-07）
*/

import veTable from '@/ve-table'
import { isCellInSelectionRange } from '@/ve-table/src/util'
import { later, mockCellRects } from '@test-utils'
import { KEY_CODES } from '@test-utils/constant'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'

describe('veTable state reconcile', () => {
  const TABLE_DATA = [
    { rowKey: 'r1', name: 'John', date: '1900-05-20', hobby: 'coding' },
    { rowKey: 'r2', name: 'Dickerson', date: '1910-06-20', hobby: 'reading' },
    { rowKey: 'r3', name: 'Larsen', date: '2000-07-20', hobby: 'running' },
    { rowKey: 'r4', name: 'Geneva', date: '2010-08-20', hobby: 'cooking' },
    { rowKey: 'r5', name: 'Jami', date: '2020-09-20', hobby: 'singing' },
  ]

  const COLUMNS = [
    { field: 'name', key: 'name', title: 'Name', width: 100, edit: true },
    { field: 'date', key: 'date', title: 'Date', width: 100, edit: true },
    { field: 'hobby', key: 'hobby', title: 'Hobby', width: 100, edit: true },
  ]

  const EMPTY_CELL = { rowKey: '', colKey: '', rowIndex: -1 }

  let wrapper: any = null
  // 渲染函数 / watcher 中抛出的异常
  let vueErrors: unknown[] = []

  function mountTable(props: Record<string, any> = {}) {
    vueErrors = []
    wrapper = mount(veTable, {
      props: {
        columns: cloneDeep(COLUMNS),
        tableData: cloneDeep(TABLE_DATA),
        rowKeyFieldName: 'rowKey',
        editOption: {},
        ...props,
      },
      global: {
        config: {
          errorHandler: (err: unknown) => {
            vueErrors.push(err)
          },
        },
      },
    })
    return wrapper
  }

  function removeRows(keys: string[]) {
    return wrapper.setProps({
      tableData: wrapper.props('tableData').filter((x: any) => !keys.includes(x.rowKey)),
    })
  }

  function rowOf(rowKey: string) {
    return wrapper.props('tableData').find((x: any) => x.rowKey === rowKey)
  }

  function copyEvent() {
    return { preventDefault: vi.fn(), clipboardData: { setData: vi.fn() } }
  }

  function pasteEvent(text: string) {
    return { preventDefault: vi.fn(), clipboardData: { getData: () => text } }
  }

  function keydown(keyCode: number) {
    const event = new KeyboardEvent('keydown', { keyCode, bubbles: true, cancelable: true })
    // SEL-02：只处理目标在表格内的按键，先在表格根元素上派发，让事件目标落在表格内
    wrapper.element.dispatchEvent(event)
    return event
  }

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
  })

  describe('selection state when columns or rows change (SEL-01)', () => {
    it('hiding the selected column clears the selection without a render error', async () => {
      // 让选区真正渲染边框（getBorders → cornerCellInfo）
      mockCellRects()
      mountTable()
      const { vm } = wrapper

      vm.setCellSelection({ rowKey: 'r2', colKey: 'date' })
      await later()
      expect(wrapper.find('.ve-table-selection-corner').exists()).toBe(true)

      vm.hideColumnsByKeys(['date'])
      await later()

      expect(vueErrors).toEqual([])
      expect(vm.cellSelectionData.currentCell).toEqual(EMPTY_CELL)
      expect(vm.cellSelectionRangeData).toEqual({
        leftColKey: '',
        rightColKey: '',
        topRowKey: '',
        bottomRowKey: '',
      })
    })

    it('hiding the end column of a range collapses it to the current cell', async () => {
      mockCellRects()
      mountTable()
      const { vm } = wrapper

      vm.setRangeCellSelection({
        startRowKey: 'r2',
        startColKey: 'name',
        endRowKey: 'r3',
        endColKey: 'date',
      })
      await later()
      expect(vm.cellSelectionRangeData.rightColKey).toBe('date')

      vm.hideColumnsByKeys(['date'])
      await later()

      expect(vueErrors).toEqual([])
      expect(vm.cellSelectionData.currentCell).toEqual({ rowKey: 'r2', colKey: 'name', rowIndex: 1 })
      expect(vm.cellSelectionData.normalEndCell).toEqual(EMPTY_CELL)
      expect(vm.cellSelectionRangeData).toEqual({
        leftColKey: 'name',
        rightColKey: 'name',
        topRowKey: 'r2',
        bottomRowKey: 'r2',
      })
    })

    it('hiding every column while a cell is selected does not crash the selection layer', async () => {
      mockCellRects()
      mountTable()
      const { vm } = wrapper

      vm.setCellSelection({ rowKey: 'r2', colKey: 'date' })
      await later()
      expect(wrapper.find('.ve-table-selection-corner').exists()).toBe(true)

      vm.hideColumnsByKeys(['name', 'date', 'hobby'])
      await later()

      expect(vueErrors).toEqual([])
      expect(vm.colgroups).toEqual([])
      expect(vm.cellSelectionData.currentCell).toEqual(EMPTY_CELL)
    })

    it('cornerCellInfo tolerates a range column that is not in colgroups', async () => {
      // 第一列是右固定列时，index === -1 会读到 colgroups[-1]
      mountTable({
        columns: cloneDeep(COLUMNS).map(x => ({ ...x, fixed: 'right' })),
      })
      const { vm } = wrapper
      vm.setCellSelection({ rowKey: 'r2', colKey: 'date' })
      await later()

      const selection = wrapper.findComponent({ name: 'VeTableSelection' })
      expect(selection.exists()).toBe(true)

      // 绕过同步 watcher，直接制造一个过期的 range
      vm.cellSelectionRangeData.rightColKey = 'missing'
      expect(() => selection.vm.cornerCellInfo).not.toThrow()
      expect(selection.vm.cornerCellInfo.isLastColumn).toBe(false)
    })

    it('pressing F2 or typing after the selected column was hidden does not throw', async () => {
      mountTable()
      const { vm } = wrapper

      vm.setCellSelection({ rowKey: 'r2', colKey: 'date' })
      await later()
      vm.hideColumnsByKeys(['date'])
      await later()

      expect(() => vm.dealKeydownEvent(keydown(KEY_CODES.F2))).not.toThrow()
      expect(() => vm.dealKeydownEvent(keydown(65))).not.toThrow()
      expect(vm.isCellEditing).toBe(false)
    })

    it('pressing F2 or typing on a current cell with an unknown column does not throw', async () => {
      mountTable()
      const { vm } = wrapper

      vm.setCellSelection({ rowKey: 'r2', colKey: 'date' })
      await later()

      // 绕过同步 watcher（colgroups 没变），直接验证防御性判断
      vm.cellSelectionData.currentCell.colKey = 'missing'

      expect(() => vm.dealKeydownEvent(keydown(KEY_CODES.F2))).not.toThrow()
      expect(() => vm.dealKeydownEvent(keydown(65))).not.toThrow()
      expect(vm.isCellEditing).toBe(false)
    })

    describe('removing the row of normalEndCell', () => {
      async function setup() {
        mountTable()
        const { vm } = wrapper

        // 向上选择：normalEndCell 是最上面一行
        vm.setRangeCellSelection({
          startRowKey: 'r3',
          startColKey: 'name',
          endRowKey: 'r1',
          endColKey: 'date',
        })
        await later()
        expect(vm.cellSelectionRangeData.topRowKey).toBe('r1')

        await removeRows(['r1'])
        await later()
        return vm
      }

      it('collapses the range to the current cell', async () => {
        const vm = await setup()

        expect(vueErrors).toEqual([])
        expect(vm.cellSelectionData.currentCell).toEqual({ rowKey: 'r3', colKey: 'name', rowIndex: 1 })
        expect(vm.cellSelectionData.normalEndCell).toEqual(EMPTY_CELL)
        expect(vm.cellSelectionRangeData).toEqual({
          leftColKey: 'name',
          rightColKey: 'name',
          topRowKey: 'r3',
          bottomRowKey: 'r3',
        })
      })

      it('copy writes the current cell, not an empty string', async () => {
        const vm = await setup()
        const event = copyEvent()

        vm.editorCopy(event)

        expect(event.clipboardData.setData).toHaveBeenCalledWith(
          'text/plain',
          expect.stringContaining('Larsen'),
        )
      })

      it('paste does not throw and writes into the current cell', async () => {
        const vm = await setup()

        expect(() => vm.editorPaste(pasteEvent('PASTED'))).not.toThrow()
        expect(rowOf('r3').name).toBe('PASTED')
      })

      it('right-click does not throw', async () => {
        const vm = await setup()
        const column = vm.colgroups.find((x: any) => x.key === 'date')

        expect(() =>
          vm.bodyCellMousedown({
            event: { which: 3, shiftKey: false },
            rowData: rowOf('r2'),
            column,
          }),
        ).not.toThrow()
      })
    })

    it('removing the edited row clears editing so copy, paste and Delete work again', async () => {
      mountTable()
      const { vm } = wrapper

      vm.startEditingCell({ rowKey: 'r2', colKey: 'name', defaultValue: 'X' })
      await later()
      expect(vm.isCellEditing).toBe(true)

      await removeRows(['r2'])
      await later()

      expect(vueErrors).toEqual([])
      expect(vm.isCellEditing).toBe(false)

      vm.setCellSelection({ rowKey: 'r3', colKey: 'name' })
      await later()

      const event = copyEvent()
      vm.editorCopy(event)
      expect(event.clipboardData.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('Larsen'),
      )

      vm.editorPaste(pasteEvent('PASTED'))
      expect(rowOf('r3').name).toBe('PASTED')

      vm.dealKeydownEvent(keydown(KEY_CODES.DELETE))
      expect(rowOf('r3').name).toBe('')
    })

    it('stopEditingCell after the edited row was removed in place clears editing', async () => {
      mountTable()
      const { vm } = wrapper

      vm.startEditingCell({ rowKey: 'r2', colKey: 'name', defaultValue: 'X' })
      await later()
      expect(vm.isCellEditing).toBe(true)

      // 普通数组原地删除：同步 watcher 不会触发，只能靠 saveCellWhenStopEditing 自己兜底
      const data = wrapper.props('tableData')
      data.splice(1, 1)
      vm.stopEditingCell()

      expect(vm.isCellEditing).toBe(false)
      expect(vm.enableStopEditing).toBe(true)
    })

    it('isCellInSelectionRange returns false for a range with unknown keys', () => {
      const colgroups = cloneDeep(COLUMNS)
      const allRowKeys = TABLE_DATA.map(x => x.rowKey)

      expect(
        isCellInSelectionRange({
          cellData: { rowKey: 'r2', colKey: 'name' },
          cellSelectionRangeData: {
            leftColKey: 'name',
            rightColKey: 'date',
            topRowKey: 'r1',
            bottomRowKey: 'removed',
          },
          colgroups,
          allRowKeys,
        }),
      ).toBe(false)

      expect(
        isCellInSelectionRange({
          cellData: { rowKey: 'r2', colKey: 'name' },
          cellSelectionRangeData: {
            leftColKey: 'removed',
            rightColKey: 'date',
            topRowKey: 'r1',
            bottomRowKey: 'r3',
          },
          colgroups,
          allRowKeys,
        }),
      ).toBe(false)
    })
  })

  describe('startEditingCell while another cell is editing (EDIT-04)', () => {
    it('saves the previous cell before editing the next one', async () => {
      const afterCellValueChange = vi.fn()
      mountTable({ editOption: { afterCellValueChange } })
      const { vm } = wrapper

      vm.startEditingCell({ rowKey: 'r1', colKey: 'name', defaultValue: 'AAA' })
      await later()
      vm.startEditingCell({ rowKey: 'r2', colKey: 'date' })
      await later()

      expect(rowOf('r1').name).toBe('AAA')
      expect(afterCellValueChange).toHaveBeenCalledTimes(1)
      expect(afterCellValueChange.mock.calls[0][0].changeValue).toBe('AAA')
      expect(vm.editingCell.rowKey).toBe('r2')
      expect(vm.editingCell.colKey).toBe('date')
    })

    it('ignores an unknown rowKey or colKey without throwing', async () => {
      mountTable()
      const { vm } = wrapper

      expect(() => vm.startEditingCell({ rowKey: 'missing', colKey: 'name' })).not.toThrow()
      expect(() => vm.startEditingCell({ rowKey: 'r1', colKey: 'missing' })).not.toThrow()
      expect(vm.isCellEditing).toBe(false)

      // 正在编辑时传入未知的 key：保持当前编辑
      vm.startEditingCell({ rowKey: 'r1', colKey: 'name', defaultValue: 'AAA' })
      await later()
      expect(() => vm.startEditingCell({ rowKey: 'missing', colKey: 'name' })).not.toThrow()
      expect(vm.editingCell.rowKey).toBe('r1')
      expect(vm.editingCell.colKey).toBe('name')
    })
  })

  describe('throwing editing and autofill callbacks (INFRA-07)', () => {
    it('a throwing beforeCellValueChange cancels the change and still clears editing', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const afterCellValueChange = vi.fn()
      mountTable({
        editOption: {
          beforeCellValueChange: () => {
            throw new Error('before boom')
          },
          afterCellValueChange,
        },
      })
      const { vm } = wrapper

      vm.startEditingCell({ rowKey: 'r1', colKey: 'name', defaultValue: 'AAA' })
      vm.enableStopEditing = false
      await later()

      expect(() => vm.stopEditingCell()).not.toThrow()

      expect(rowOf('r1').name).toBe('John')
      expect(afterCellValueChange).not.toHaveBeenCalled()
      expect(vm.isCellEditing).toBe(false)
      expect(vm.enableStopEditing).toBe(true)
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError.mock.calls[0][0]).toContain('beforeCellValueChange')

      // 再次停止编辑不会重复抛出 / 记录
      vm.stopEditingCell()
      expect(consoleError).toHaveBeenCalledTimes(1)
    })

    it('a throwing afterCellValueChange keeps the change and clears editing once', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const afterCellValueChange = vi.fn(() => {
        throw new Error('after boom')
      })
      mountTable({ editOption: { afterCellValueChange } })
      const { vm } = wrapper

      vm.startEditingCell({ rowKey: 'r1', colKey: 'name', defaultValue: 'AAA' })
      await later()

      expect(() => vm.stopEditingCell()).not.toThrow()
      expect(rowOf('r1').name).toBe('AAA')
      expect(vm.isCellEditing).toBe(false)

      expect(() => vm.stopEditingCell()).not.toThrow()
      expect(afterCellValueChange).toHaveBeenCalledTimes(1)
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError.mock.calls[0][0]).toContain('afterCellValueChange')
    })

    it('after callbacks see the editing state already cleared', async () => {
      let editingDuringCallback: boolean | null = null
      mountTable({
        editOption: {
          afterCellValueChange: () => {
            editingDuringCallback = wrapper.vm.isCellEditing
          },
        },
      })
      const { vm } = wrapper

      vm.startEditingCell({ rowKey: 'r1', colKey: 'name', defaultValue: 'AAA' })
      await later()
      vm.stopEditingCell()

      expect(editingDuringCallback).toBe(false)
    })

    async function autofillDown(vm: any) {
      vm.setCellSelection({ rowKey: 'r1', colKey: 'name' })
      await later()
      // 模拟一次向下拖动填充（方向由结束单元格的行列位置计算，FILL-01）
      vm.cellSelectionAutofillCellChange({ rowKey: 'r3', colKey: 'name' })
      vm.isAutofillStarting = true
      await later()
      vm.isAutofillStarting = false
      await later()
    }

    it('a throwing afterAutofill still updates the selection and clears the autofill end cell', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const afterAutofill = vi.fn(() => {
        throw new Error('autofill boom')
      })
      mountTable({ cellAutofillOption: { afterAutofill } })
      const { vm } = wrapper

      await autofillDown(vm)

      expect(vueErrors).toEqual([])
      expect(afterAutofill).toHaveBeenCalledTimes(1)
      expect(rowOf('r2').name).toBe('John')
      expect(rowOf('r3').name).toBe('John')
      expect(vm.cellSelectionData.currentCell).toEqual({ rowKey: 'r1', colKey: 'name', rowIndex: 0 })
      expect(vm.cellSelectionData.normalEndCell).toEqual({ rowKey: 'r3', colKey: 'name', rowIndex: 2 })
      expect(vm.cellSelectionData.autoFillEndCell).toEqual({ rowKey: '', colKey: '' })
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError.mock.calls[0][0]).toContain('afterAutofill')
    })

    it('a throwing beforeAutofill cancels the fill and still clears the autofill end cell', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const afterAutofill = vi.fn()
      mountTable({
        cellAutofillOption: {
          beforeAutofill: () => {
            throw new Error('before autofill boom')
          },
          afterAutofill,
        },
      })
      const { vm } = wrapper

      await autofillDown(vm)

      expect(vueErrors).toEqual([])
      expect(afterAutofill).not.toHaveBeenCalled()
      expect(rowOf('r2').name).toBe('Dickerson')
      expect(vm.cellSelectionData.currentCell).toEqual({ rowKey: 'r1', colKey: 'name', rowIndex: 0 })
      expect(vm.cellSelectionData.normalEndCell).toEqual(EMPTY_CELL)
      expect(vm.cellSelectionData.autoFillEndCell).toEqual({ rowKey: '', colKey: '' })
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError.mock.calls[0][0]).toContain('beforeAutofill')
    })
  })
})
