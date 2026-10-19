import veTable from '@/ve-table'
import { later, wrapMount } from '@test-utils'
import { KEY_CODES } from '@test-utils/constant'
import { mount } from '@vue/test-utils'

describe('veTable cell selection', () => {
  const TABLE_DATA = [
    {
      name: 'John',
      date: '1900-05-20',
      hobby: 'coding',
      address: 'No.1 Century Avenue, Shanghai',
      rowKey: '1',
    },
    {
      name: 'Dickerson',
      date: '1910-06-20',
      hobby: 'coding',
      address: 'No.1 Century Avenue, Beijing',
      rowKey: '2',
    },
    {
      name: 'Larsen',
      date: '2000-07-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Chongqing',
      rowKey: '3',
    },
    {
      name: 'Geneva',
      date: '2010-08-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Xiamen',
      rowKey: '4',
    },
    {
      name: 'Jami',
      date: '2020-09-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shenzhen',
      rowKey: '5',
    },
  ]

  const COLUMNS = [
    {
      field: 'index',
      key: 'index',
      operationColumn: true,
      title: '#',
      width: 50,
      align: 'center',
      renderBodyCell: ({ rowIndex }: { rowIndex: number, row: Record<string, unknown>, column: Record<string, unknown> }) => {
        return ++rowIndex
      },
      edit: true,
    },
    {
      field: 'name',
      key: 'a',
      title: 'Name',
      align: 'left',
      width: '20%',
    },
    {
      field: 'date',
      key: 'b',
      title: 'Date',
      align: 'left',
      width: '20%',
    },
    {
      field: 'hobby',
      key: 'c',
      title: 'Hobby',
      align: 'center',
      width: '30%',
    },
    { field: 'address', key: 'd', title: 'Address', width: '30%' },
  ]

  it('single cell selection indicator', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    ;(wrapper.vm as any).setCellSelection({ rowKey: '2', colKey: 'a' })

    await later()

    const th = wrapper
      .findAll('.ve-table-header-tr')[0]
      .findAll('.ve-table-header-th')[1]

    expect(th.classes()).toContain('ve-table-cell-indicator')

    const td = wrapper
      .find('tr[row-key=\'2\']')
      .findAll('.ve-table-body-td')[0]
    expect(td.classes()).toContain('ve-table-cell-indicator')
  })

  it('range cell selection header indicator', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    ;(wrapper.vm as any).setRangeCellSelection({
      startRowKey: '2',
      startColKey: 'a',
      endRowKey: '5',
      endColKey: 'c',
      isScrollToStartCell: true,
    })

    await later()

    expect(
      wrapper.findAll(
        '.ve-table-header .ve-table-header-th.ve-table-cell-indicator',
      ).length,
    ).toEqual(3)

    expect(
      wrapper.findAll(
        '.ve-table-body .ve-table-body-td.ve-table-cell-indicator',
      ).length,
    ).toEqual(4)
  })

  /*
   * SEL-09：方向键等键盘导航把选区收缩为单个单元格后，整列 / 整行选择的指示器状态应被清除；
   * 指示器只保存 key，行列位置变化后按 key 重新计算下标
   */
  describe('indicator state after keyboard navigation (SEL-09)', () => {
    let wrapper: any = null

    afterEach(() => {
      wrapper?.unmount()
      wrapper = null
    })

    function mountTable(tableData = TABLE_DATA) {
      wrapper = wrapMount(veTable, {
        propsData: {
          columns: COLUMNS,
          tableData,
          rowKeyFieldName: 'rowKey',
        },
      })
      return wrapper.vm as any
    }

    function keydown(keyCode: number) {
      const event = new KeyboardEvent('keydown', { keyCode, bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      return event
    }

    function headerTh(colKey: string) {
      const index = COLUMNS.findIndex(x => x.key === colKey)
      return wrapper.findAll('.ve-table-header-th')[index]
    }

    // jsdom 的 MouseEvent.which 恒为 0，这里显式指定为右键
    function rightMousedown(el: Element) {
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 })
      Object.defineProperty(event, 'which', { value: 3 })
      el.dispatchEvent(event)
    }

    function operationTd(rowKey: string) {
      return wrapper.find(`tr[row-key="${rowKey}"]`).findAll('.ve-table-body-td')[0]
    }

    it('arrow keys after selecting a whole column clear the header indicator', async () => {
      const vm = mountTable()

      await headerTh('b').trigger('mousedown')
      await later()
      await later()
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'b', rightColKey: 'b', topRowKey: '1', bottomRowKey: '5' })
      expect(headerTh('b').classes()).toContain('ve-table-cell-indicator-active')

      keydown(KEY_CODES.ARROW_DOWN)
      await later()
      await later()

      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'b' })
      expect(vm.headerIndicatorColKeys.startColKey).toBe('')
      expect(vm.headerIndicatorColKeys.endColKey).toBe('')
      expect(headerTh('b').classes()).toContain('ve-table-cell-indicator')
      expect(headerTh('b').classes()).not.toContain('ve-table-cell-indicator-active')
      // 右键菜单类型回到 body
      expect(vm.contextMenuType).toBe('bodyContextmenu')
    })

    it('arrow keys after selecting a whole row clear the row indicator, so clicking it again re-selects the row', async () => {
      const vm = mountTable()

      await operationTd('2').trigger('mousedown')
      await later()
      await later()
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'a', rightColKey: 'd', topRowKey: '2', bottomRowKey: '2' })

      keydown(KEY_CODES.ARROW_RIGHT)
      await later()
      await later()

      expect(vm.bodyIndicatorRowKeys.startRowKey).toBe('')
      expect(operationTd('2').classes()).toContain('ve-table-cell-indicator')
      expect(operationTd('2').classes()).not.toContain('ve-table-cell-indicator-active')

      // 再次点击同一行的指示器，重新选中整行（之前指示器 key 未变化，watcher 不触发，选区停在单个单元格）
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await operationTd('2').trigger('mousedown')
      await later()
      await later()
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'a', rightColKey: 'd', topRowKey: '2', bottomRowKey: '2' })
    })

    it('tab and enter also clear the indicators', async () => {
      const vm = mountTable()

      await headerTh('b').trigger('mousedown')
      await later()
      keydown(KEY_CODES.TAB)
      await later()
      expect(vm.headerIndicatorColKeys.startColKey).toBe('')

      await wrapper.find('.ve-table-container').trigger('mouseup')
      await operationTd('3').trigger('mousedown')
      await later()
      keydown(KEY_CODES.ENTER)
      await later()
      expect(vm.bodyIndicatorRowKeys.startRowKey).toBe('')
    })

    it('setCellSelection and setRangeCellSelection after setAllCellSelection clear the indicators', async () => {
      const vm = mountTable()

      vm.setAllCellSelection()
      await later()
      expect(headerTh('a').classes()).toContain('ve-table-cell-indicator-active')

      vm.setCellSelection({ rowKey: '2', colKey: 'b' })
      await later()
      expect(vm.headerIndicatorColKeys.startColKey).toBe('')
      expect(vm.bodyIndicatorRowKeys.startRowKey).toBe('')
      expect(headerTh('b').classes()).toContain('ve-table-cell-indicator')
      expect(headerTh('b').classes()).not.toContain('ve-table-cell-indicator-active')

      vm.setAllCellSelection()
      await later()
      vm.setRangeCellSelection({ startRowKey: '2', startColKey: 'a', endRowKey: '3', endColKey: 'b' })
      await later()
      expect(vm.headerIndicatorColKeys.startColKey).toBe('')
      expect(vm.bodyIndicatorRowKeys.startRowKey).toBe('')
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'a', rightColKey: 'b', topRowKey: '2', bottomRowKey: '3' })
    })

    it('right-clicking inside a row selection keeps it after rows are inserted above', async () => {
      const tableData = TABLE_DATA.map(x => ({ ...x }))
      const vm = mountTable(tableData)

      // 选中第 2、3 行
      await operationTd('2').trigger('mousedown')
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await operationTd('3').trigger('mousedown', { shiftKey: true })
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.cellSelectionRangeData).toMatchObject({ topRowKey: '2', bottomRowKey: '3' })

      // 在上方插入一行，第 3 行的下标从 2 变为 3
      await wrapper.setProps({ tableData: [{ ...TABLE_DATA[0], rowKey: '0' }, ...tableData] })
      await later()

      // 在选区内右键：保留整行选择（之前用过期的下标判断，选区被重置为第 3 行）
      rightMousedown(operationTd('3').element)
      await later()
      expect(vm.bodyIndicatorRowKeys).toMatchObject({ startRowKey: '2', endRowKey: '3' })
      expect(vm.cellSelectionRangeData).toMatchObject({ topRowKey: '2', bottomRowKey: '3' })
    })

    // SEL-15：从下往上（或从右往左）拖出的整行 / 整列选择，起点下标大于终点下标
    it('right-clicking inside a row selection dragged upwards keeps it (SEL-15)', async () => {
      const vm = mountTable()

      // 按住左键从第 4 行拖到第 2 行（没有按住左键的 mouseover 会结束拖动，SEL-18）
      await operationTd('4').trigger('mousedown')
      await operationTd('3').trigger('mouseover', { buttons: 1 })
      await operationTd('2').trigger('mouseover', { buttons: 1 })
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.bodyIndicatorRowKeys).toMatchObject({ startRowKey: '4', endRowKey: '2' })
      expect(vm.cellSelectionRangeData).toMatchObject({ topRowKey: '2', bottomRowKey: '4' })

      // 在选区内（第 3 行）右键：保留整行选择（之前按 start <= end 判断，被重置为第 3 行）
      rightMousedown(operationTd('3').element)
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.bodyIndicatorRowKeys).toMatchObject({ startRowKey: '4', endRowKey: '2' })
      expect(vm.cellSelectionRangeData).toMatchObject({ topRowKey: '2', bottomRowKey: '4' })

      // 在选区外右键：仍然重置为该行
      rightMousedown(operationTd('5').element)
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.bodyIndicatorRowKeys).toMatchObject({ startRowKey: '5', endRowKey: '5' })
    })

    it('right-clicking inside a column selection dragged leftwards keeps it (SEL-15)', async () => {
      const vm = mountTable()

      // 按住左键从 c 列拖到 a 列
      await headerTh('c').trigger('mousedown')
      await headerTh('b').trigger('mouseover', { buttons: 1 })
      await headerTh('a').trigger('mouseover', { buttons: 1 })
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'c', endColKey: 'a' })
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'a', rightColKey: 'c' })

      // 在选区内（b 列）右键：保留整列选择
      rightMousedown(headerTh('b').element)
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'c', endColKey: 'a' })
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'a', rightColKey: 'c' })

      // 在选区外右键：仍然重置为该列
      rightMousedown(headerTh('d').element)
      await wrapper.find('.ve-table-container').trigger('mouseup')
      await later()
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'd', endColKey: 'd' })
    })
  })
})
