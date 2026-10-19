import veTable from '@/ve-table'
import { later, wrapMount as mount } from '@test-utils'
import { KEY_CODES } from '@test-utils/constant'
import { expect, vi } from 'vitest'

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

  it('render', () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    expect(WRAPPER.html()).toMatchSnapshot()
  })

  it('key code up event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: KEY_CODES.ARROW_UP }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[1]
        .findAll('.ve-table-body-td')[2]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code right event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: KEY_CODES.ARROW_RIGHT }),
    )
    /* WRAPPER.trigger("keydown", {
            keyCode: 40
        }); */

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[2]
        .findAll('.ve-table-body-td')[3]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code down event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: KEY_CODES.ARROW_DOWN }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[3]
        .findAll('.ve-table-body-td')[2]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code left event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: KEY_CODES.ARROW_LEFT }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[2]
        .findAll('.ve-table-body-td')[1]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code enter event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: KEY_CODES.ENTER }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[3]
        .findAll('.ve-table-body-td')[2]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code shift+enter event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        keyCode: KEY_CODES.ENTER,
        shiftKey: true,
      }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[1]
        .findAll('.ve-table-body-td')[2]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code tab event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: KEY_CODES.TAB }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[2]
        .findAll('.ve-table-body-td')[3]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('key code shift+tab event', async () => {
    const WRAPPER = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })
    const mockFn = vi.fn()

    expect(WRAPPER.find('.ve-table-cell-selection').exists()).toBe(false)

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown')

    await later()
    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    document.addEventListener('keydown', mockFn)
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        keyCode: KEY_CODES.TAB,
        shiftKey: true,
      }),
    )

    await later()
    expect(mockFn).toBeCalled()
    expect(firstTrTdEl.find('.ve-table-cell-selection').exists()).toBe(
      false,
    )

    expect(
      WRAPPER.findAll('.ve-table-body-tr')[2]
        .findAll('.ve-table-body-td')[1]
        .classes(),
    ).toContain('ve-table-cell-selection')
  })

  it('cell selection effect', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: true,
        },
        rowKeyFieldName: 'rowKey',
      },
    })

    const firstCell = wrapper
      .findAll('.ve-table-body-tr')[0]
      .findAll('.ve-table-body-td')[0]

    expect(firstCell.classes().includes('ve-table-cell-selection')).toBe(false)

    firstCell.trigger('mousedown')

    await later()

    expect(firstCell.classes()).contain('ve-table-cell-selection')
  })

  it('disable cell selection', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        cellSelectionOption: {
          // default true
          enable: false,
        },
        rowKeyFieldName: 'rowKey',
      },
    })

    const firstCell = wrapper
      .findAll('.ve-table-body-tr')[0]
      .findAll('.ve-table-body-td')[0]

    expect(firstCell.find('.ve-table-cell-selection').exists()).toBe(false)

    firstCell.trigger('mousedown')

    await later()

    expect(firstCell.find('.ve-table-cell-selection').exists()).toBe(false)
  })

  // table clickoutside
  it('table clickoutside width cell editing', async () => {
    const ParentComp = {
      template: `
                <div>
                    <button id="outsideButton">outside table</button>
                    <veTable
                        :columns="columns"
                        :tableData="tableData"
                        rowKeyFieldName="rowKey"
                    />
                </div>
               
            `,
      data() {
        return {
          columns: COLUMNS,
          tableData: TABLE_DATA,
        }
      },
      // veTable is in global
      // components: {
      //     veTable,
      // },
    }

    await later()

    const div = document.createElement('div')
    document.body.appendChild(div)

    // need attach to documnet
    const wrapper = mount(ParentComp, { attachTo: div })
    // td
    const firstCell = wrapper
      .findAll('.ve-table-body-tr')[1]
      .findAll('.ve-table-body-td')[1]

    // set cell selection
    firstCell.trigger('mousedown')

    await later()
    expect(firstCell.classes()).toContain('ve-table-cell-selection')

    // click outside
    wrapper.find('#outsideButton').trigger('click')

    await later()

    expect(firstCell.find('.ve-table-cell-selection').exists()).toBe(false)
  })

  it('table instance: setCellSelection method', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    ;(wrapper.vm as any).setCellSelection({ rowKey: '2', colKey: 'a' })

    await later()

    const selectionTd = wrapper
      .findAll('.ve-table-body-tr')[1]
      .findAll('.ve-table-body-td')[0]

    expect(selectionTd.classes()).toContain('ve-table-cell-selection')
  })

  it('table instance: setRangeCellSelection method', async () => {
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

    const selectionTd = wrapper
      .findAll('.ve-table-body-tr')[1]
      .findAll('.ve-table-body-td')[0]

    expect(selectionTd.classes()).toContain('ve-table-cell-selection')
    expect((wrapper.vm as any).cellSelectionRangeData).toEqual({
      bottomRowKey: '5',
      leftColKey: 'a',
      rightColKey: 'c',
      topRowKey: '2',
    })
  })

  /*
  SEL-11：在表格内开始拖动、在表格外（页面内）松开时，浏览器在公共祖先上触发 click（detail 为 1）。
  这不是一次“在表格外的点击”，不应清除选区；但拖动本身要结束
  */
  describe('releasing a drag outside the table (SEL-11)', () => {
    let wrapper: any = null

    afterEach(() => {
      wrapper?.unmount()
      wrapper = null
    })

    function mountInPage() {
      const ParentComp = {
        template: `
          <div class="page">
            <button class="outside">outside table</button>
            <veTable :columns="columns" :tableData="tableData" rowKeyFieldName="rowKey" />
          </div>
        `,
        data() {
          return { columns: COLUMNS, tableData: TABLE_DATA }
        },
      }
      wrapper = mount(ParentComp, { attachTo: document.body })
      return wrapper.findComponent(veTable).vm as any
    }

    function td(rowIndex: number, colIndex: number) {
      return wrapper.findAll('.ve-table-body-tr')[rowIndex].findAll('.ve-table-body-td')[colIndex].element as HTMLElement
    }

    function mouse(type: string, el: Element, init: MouseEventInit = {}) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, buttons: 1, detail: 1, ...init }))
    }

    // 在表格外松开：mouseup 在外部按钮上，click 在公共祖先（.page）上
    async function releaseOutside() {
      mouse('mouseup', wrapper.find('.outside').element, { buttons: 0 })
      mouse('click', wrapper.element, { buttons: 0 })
      await later()
    }

    it('keeps a range selection, and the drag ends', async () => {
      const vm = mountInPage()

      mouse('mousedown', td(1, 1))
      mouse('mouseover', td(3, 2))
      await later()
      expect(vm.cellSelectionRangeData).toEqual({ leftColKey: 'b', rightColKey: 'c', topRowKey: '2', bottomRowKey: '4' })

      await releaseOutside()

      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'b' })
      expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '4', colKey: 'c' })
      expect(vm.cellSelectionRangeData).toEqual({ leftColKey: 'b', rightColKey: 'c', topRowKey: '2', bottomRowKey: '4' })

      // 拖动已结束：之后鼠标经过其他单元格不再扩展选区
      mouse('mouseover', td(4, 3), { buttons: 0 })
      await later()
      expect(vm.isBodyCellMousedown).toBe(false)
      expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '4', colKey: 'c' })
    })

    it('keeps a single cell selection', async () => {
      const vm = mountInPage()

      mouse('mousedown', td(2, 0))
      await releaseOutside()

      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '3', colKey: 'a' })
    })

    it('keeps a column selection dragged over the header, and the drag ends', async () => {
      const vm = mountInPage()
      const ths = wrapper.findAll('.ve-table-header-th')

      mouse('mousedown', ths[0].element)
      mouse('mouseover', ths[1].element)
      await later()
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'a', endColKey: 'b' })

      await releaseOutside()

      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'a', endColKey: 'b' })
      expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 'a', rightColKey: 'b', topRowKey: '1', bottomRowKey: '5' })

      mouse('mouseover', ths[3].element, { buttons: 0 })
      await later()
      expect(vm.isHeaderCellMousedown).toBe(false)
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'a', endColKey: 'b' })
    })

    it('a real click outside the table still clears the selection', async () => {
      const vm = mountInPage()

      mouse('mousedown', td(1, 1))
      mouse('mouseup', td(1, 1), { buttons: 0 })
      mouse('click', td(1, 1), { buttons: 0 })
      await later()
      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'b' })

      const outside = wrapper.find('.outside').element
      mouse('mousedown', outside)
      mouse('mouseup', outside, { buttons: 0 })
      mouse('click', outside, { buttons: 0 })
      await later()
      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '', colKey: '' })
    })

    it('removes its document listener when the drag ends and on unmount', async () => {
      const add = vi.spyOn(document, 'addEventListener')
      const remove = vi.spyOn(document, 'removeEventListener')
      mountInPage()
      const added = () => add.mock.calls.filter(([type]) => type === 'mouseup')
      const isRemoved = ([type, fn, options]: any[]) =>
        remove.mock.calls.some(([t, f, o]) => t === type && f === fn && o === options)

      mouse('mousedown', td(1, 1))
      expect(added().length).toBe(1)
      await releaseOutside()
      expect(added().every(isRemoved)).toBe(true)

      // 拖动中卸载
      mouse('mousedown', td(2, 1))
      expect(added().length).toBe(2)
      wrapper.unmount()
      wrapper = null
      expect(added().every(isRemoved)).toBe(true)

      add.mockRestore()
      remove.mockRestore()
    })

    /*
    SEL-18：拖动中窗口失焦（例如 Alt+Tab），mouseup 可能永远不会到达。
    失焦或经过单元格时没有按住左键，都要结束拖动，否则之后鼠标经过单元格仍会扩展选区
    */
    it('a window blur ends a range drag (SEL-18)', async () => {
      const vm = mountInPage()

      mouse('mousedown', td(1, 1))
      mouse('mouseover', td(3, 2))
      await later()
      expect(vm.isBodyCellMousedown).toBe(true)

      window.dispatchEvent(new Event('blur'))
      // 即使事件仍报告按住左键，拖动也已结束
      mouse('mouseover', td(4, 3))
      await later()

      expect(vm.isBodyCellMousedown).toBe(false)
      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'b' })
      expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '4', colKey: 'c' })
    })

    it('a window blur ends a column drag over the header (SEL-18)', async () => {
      const vm = mountInPage()
      const ths = wrapper.findAll('.ve-table-header-th')

      mouse('mousedown', ths[0].element)
      mouse('mouseover', ths[1].element)
      await later()

      window.dispatchEvent(new Event('blur'))
      mouse('mouseover', ths[3].element)
      await later()

      expect(vm.isHeaderCellMousedown).toBe(false)
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'a', endColKey: 'b' })
    })

    it('hovering a cell with no button held ends a drag whose mouseup was lost (SEL-18)', async () => {
      const vm = mountInPage()

      mouse('mousedown', td(1, 1))
      mouse('mouseover', td(3, 2))
      await later()

      // mouseup 没有到达（没有 document mouseup，也没有 blur）
      mouse('mouseover', td(4, 3), { buttons: 0 })
      await later()

      expect(vm.isBodyCellMousedown).toBe(false)
      expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '4', colKey: 'c' })
      // 之后再按住左键经过单元格也不会恢复拖动
      mouse('mouseover', td(4, 3))
      await later()
      expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '4', colKey: 'c' })
    })

    it('hovering a header cell with no button held ends a column drag whose mouseup was lost (SEL-18)', async () => {
      const vm = mountInPage()
      const ths = wrapper.findAll('.ve-table-header-th')

      mouse('mousedown', ths[0].element)
      mouse('mouseover', ths[1].element)
      await later()

      mouse('mouseover', ths[3].element, { buttons: 0 })
      await later()

      expect(vm.isHeaderCellMousedown).toBe(false)
      expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 'a', endColKey: 'b' })
    })

    it('removes its window blur listener when the drag ends and on unmount (SEL-18)', async () => {
      const add = vi.spyOn(window, 'addEventListener')
      const remove = vi.spyOn(window, 'removeEventListener')
      mountInPage()
      const added = () => add.mock.calls.filter(([type]) => type === 'blur')
      const isRemoved = ([type, fn]: any[]) =>
        remove.mock.calls.some(([t, f]) => t === type && f === fn)

      // mouseup 结束拖动
      mouse('mousedown', td(1, 1))
      expect(added().length).toBe(1)
      await releaseOutside()
      expect(added().every(isRemoved)).toBe(true)

      // blur 结束拖动
      mouse('mousedown', td(2, 1))
      expect(added().length).toBe(2)
      window.dispatchEvent(new Event('blur'))
      expect(added().every(isRemoved)).toBe(true)

      // 拖动中卸载
      mouse('mousedown', td(3, 1))
      expect(added().length).toBe(3)
      wrapper.unmount()
      wrapper = null
      expect(added().every(isRemoved)).toBe(true)

      add.mockRestore()
      remove.mockRestore()
    })

    // SEL-19：点击右键菜单项时结束拖动，同时移除 document 上的 mouseup 监听
    it('a contextmenu item click ends the drag and removes its document listener (SEL-19)', async () => {
      const ParentComp = {
        template: `
          <veTable
            :columns="columns"
            :tableData="tableData"
            rowKeyFieldName="rowKey"
            :contextmenuBodyOption="contextmenuBodyOption"
          />
        `,
        data() {
          return {
            columns: COLUMNS,
            tableData: TABLE_DATA,
            // 返回 false：只测试拖动状态，不执行菜单动作
            contextmenuBodyOption: { contextmenus: [{ type: 'CUSTOM' }], afterMenuClick: () => false },
          }
        },
      }
      const add = vi.spyOn(document, 'addEventListener')
      const remove = vi.spyOn(document, 'removeEventListener')
      wrapper = mount(ParentComp, { attachTo: document.body })
      const vm = wrapper.findComponent(veTable).vm as any
      const added = () => add.mock.calls.filter(([type]) => type === 'mouseup')
      const isRemoved = ([type, fn, options]: any[]) =>
        remove.mock.calls.some(([t, f, o]) => t === type && f === fn && o === options)

      mouse('mousedown', td(1, 1))
      expect(vm.isBodyCellMousedown).toBe(true)
      expect(added().length).toBe(1)

      vm.contextmenuItemClick('CUSTOM')

      expect(vm.isBodyCellMousedown).toBe(false)
      expect(added().every(isRemoved)).toBe(true)

      add.mockRestore()
      remove.mockRestore()
    })

    // SEL-20：tableClickOutside / tableContainerMouseup 通过 endSelectionDrag 结束拖动，同时移除 mouseup / blur 监听
    describe('other paths that end a drag remove its listeners (SEL-20)', () => {
      function spyListeners() {
        const docAdd = vi.spyOn(document, 'addEventListener')
        const docRemove = vi.spyOn(document, 'removeEventListener')
        const winAdd = vi.spyOn(window, 'addEventListener')
        const winRemove = vi.spyOn(window, 'removeEventListener')
        const isRemoved = (removeSpy: any) => ([type, fn]: any[]) =>
          removeSpy.mock.calls.some(([t, f]: any[]) => t === type && f === fn)
        return {
          // 拖动选择的 document mouseup 与 window blur
          added: () => [
            ...docAdd.mock.calls.filter(([type]) => type === 'mouseup'),
            ...winAdd.mock.calls.filter(([type]) => type === 'blur'),
          ],
          allRemoved: () =>
            docAdd.mock.calls.filter(([type]) => type === 'mouseup').every(isRemoved(docRemove))
            && winAdd.mock.calls.filter(([type]) => type === 'blur').every(isRemoved(winRemove)),
          restore: () => {
            docAdd.mockRestore()
            docRemove.mockRestore()
            winAdd.mockRestore()
            winRemove.mockRestore()
          },
        }
      }

      it('a click outside the table during a drag (no mouseup, e.g. a script click)', async () => {
        const vm = mountInPage()
        const spies = spyListeners()

        mouse('mousedown', td(1, 1))
        expect(vm.isBodyCellMousedown).toBe(true)
        expect(spies.added().length).toBe(2)

        // 没有 mousedown 的 click（detail 为 0），clickoutside 不会忽略它
        ;(wrapper.find('.outside').element as HTMLElement).click()
        await later()

        expect(vm.isBodyCellMousedown).toBe(false)
        expect(spies.allRemoved()).toBe(true)
        spies.restore()
      })

      it('the table container mouseup handler', async () => {
        const vm = mountInPage()
        const spies = spyListeners()

        mouse('mousedown', td(1, 1))
        expect(spies.added().length).toBe(2)

        // 直接调用容器的 mouseup 处理（真实事件中 document 捕获监听先执行）
        vm.tableContainerMouseup()

        expect(vm.isBodyCellMousedown).toBe(false)
        expect(spies.allRemoved()).toBe(true)
        spies.restore()
      })
    })
  })

  // SEL-12：区域选择之后调用 setCellSelection 应该得到单个单元格，而不是从新单元格到旧结束单元格的区域
  it('setCellSelection after a range selects a single cell (SEL-12)', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })
    const vm = wrapper.vm as any

    vm.setRangeCellSelection({
      startRowKey: '2',
      startColKey: 'a',
      endRowKey: '4',
      endColKey: 'c',
    })
    await later()
    expect(vm.currentCellSelectionType).toBe('range')

    vm.setCellSelection({ rowKey: '1', colKey: 'b' })
    await later()

    expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '1', colKey: 'b' })
    expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '', colKey: '', rowIndex: -1 })
    expect(vm.currentCellSelectionType).toBe('single')
    expect(vm.cellSelectionRangeData).toEqual({
      leftColKey: 'b',
      rightColKey: 'b',
      topRowKey: '1',
      bottomRowKey: '1',
    })
    expect(vm.getRangeCellSelection().selectionRangeKeys).toEqual({
      startColKey: 'b',
      endColKey: 'b',
      startRowKey: '1',
      endRowKey: '1',
    })
    wrapper.unmount()
  })

  // SEL-06：公开的选区 API 收到未知的 rowKey / colKey 时不抛错，也不改变选区
  describe('unknown keys in the selection API (SEL-06)', () => {
    function mountWithXScrollBar() {
      const wrapper = mount(veTable, {
        propsData: {
          columns: COLUMNS,
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })
      // jsdom 没有布局，直接模拟出现横向滚动条（columnToVisible 只在此时工作）
      ;(wrapper.vm as any).hasXScrollBar = true
      return wrapper
    }

    it('setCellSelection ignores an unknown colKey or rowKey', async () => {
      const wrapper = mountWithXScrollBar()
      const vm = wrapper.vm as any

      vm.setCellSelection({ rowKey: '2', colKey: 'a' })
      await later()

      expect(() => vm.setCellSelection({ rowKey: '3', colKey: 'unknown' })).not.toThrow()
      expect(() => vm.setCellSelection({ rowKey: 'unknown', colKey: 'b' })).not.toThrow()
      await later()

      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'a' })
      wrapper.unmount()
    })

    it('setRangeCellSelection ignores unknown keys', async () => {
      const wrapper = mountWithXScrollBar()
      const vm = wrapper.vm as any

      vm.setCellSelection({ rowKey: '2', colKey: 'a' })
      await later()

      expect(() => vm.setRangeCellSelection({
        startRowKey: '2',
        startColKey: 'unknown',
        endRowKey: '3',
        endColKey: 'b',
        isScrollToStartCell: true,
      })).not.toThrow()
      expect(vm.setRangeCellSelection({
        startRowKey: '2',
        startColKey: 'a',
        endRowKey: 'unknown',
        endColKey: 'b',
      })).toBe(false)
      expect(vm.setRangeCellSelection({
        startRowKey: '2',
        startColKey: 'a',
        endRowKey: '3',
        endColKey: 'unknown',
      })).toBe(false)
      await later()

      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'a' })
      expect(vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '', colKey: '' })
      wrapper.unmount()
    })

    // jsdom 没有布局：模拟 400px 宽的内容、100px 宽的容器，已滚动到最右侧
    function scrolledToRight(wrapper: any) {
      ;(wrapper.vm as any).hasXScrollBar = true
      const containerEl = wrapper.find('.ve-table-container').element as HTMLElement
      Object.defineProperty(containerEl, 'scrollWidth', { configurable: true, value: 400 })
      Object.defineProperty(containerEl, 'clientWidth', { configurable: true, value: 100 })
      containerEl.scrollLeft = 300
      return containerEl
    }

    it('columnToVisible tolerates a missing column', () => {
      const wrapper = mountWithXScrollBar()
      expect(() => (wrapper.vm as any).columnToVisible(undefined)).not.toThrow()
      wrapper.unmount()
    })

    // SEL-16：setCellSelection 改回使用 getColumnByColkey（SEL-14 之后 0 是有效的列 key）
    it('setCellSelection accepts colKey 0 and scrolls that column into view', async () => {
      const wrapper = mount(veTable, {
        propsData: {
          columns: [
            { field: 'name', key: 'a', title: 'Name', width: 100 },
            { field: 'date', key: 0, title: 'Date', width: 100 },
          ],
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })
      const vm = wrapper.vm as any
      // MOD-02：columnToVisible 在组合式函数内部调用，实例上的 spy 看不到，改为检查滚动位置。
      // jsdom 没有布局：模拟出现横向滚动条，且已滚动到最右侧
      const containerEl = scrolledToRight(wrapper)

      expect(vm.setCellSelection({ rowKey: '2', colKey: 0 })).not.toBe(false)
      await later()

      expect(vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 0 })
      // key 为 0 的列（左侧有 100px 的列 a）滚动到可见区域
      expect(containerEl.scrollLeft).toBe(100)
      wrapper.unmount()
    })

    // SEL-21：setRangeCellSelection 也使用 getColumnByColkey 检查 / 查找列，0 是有效的列 key
    it('setRangeCellSelection accepts colKey 0 and scrolls that column into view', async () => {
      const wrapper = mount(veTable, {
        propsData: {
          columns: [
            { field: 'name', key: 'a', title: 'Name', width: 100 },
            { field: 'date', key: 0, title: 'Date', width: 100 },
            { field: 'hobby', key: 1, title: 'Hobby', width: 100 },
          ],
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })
      const vm = wrapper.vm as any
      const containerEl = scrolledToRight(wrapper)

      vm.setRangeCellSelection({ startRowKey: '2', startColKey: 0, endRowKey: '3', endColKey: 1, isScrollToStartCell: true })
      await later()

      expect(vm.cellSelectionRangeData).toEqual({ leftColKey: 0, rightColKey: 1, topRowKey: '2', bottomRowKey: '3' })
      // 起始列（key 0）滚动到可见区域
      expect(containerEl.scrollLeft).toBe(100)

      // 未知的列 key（包括与数字 key 同名的字符串）仍不改变选区
      expect(vm.setRangeCellSelection({ startRowKey: '2', startColKey: '0', endRowKey: '3', endColKey: 1 })).toBe(false)
      expect(vm.setRangeCellSelection({ startRowKey: '2', startColKey: 0, endRowKey: '3', endColKey: 'x' })).toBe(false)
      await later()
      expect(vm.cellSelectionRangeData).toEqual({ leftColKey: 0, rightColKey: 1, topRowKey: '2', bottomRowKey: '3' })
      wrapper.unmount()
    })
  })

  // SEL-03：没有操作列时也从第一列开始（之前跳过了第一列，leftColKey 为 'b'）
  it('table instance: setAllCellSelection method', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    ;(wrapper.vm as any).setAllCellSelection()

    await later()

    expect((wrapper.vm as any).cellSelectionRangeData).toEqual({
      bottomRowKey: '5',
      leftColKey: 'a',
      rightColKey: 'd',
      topRowKey: '1',
    })
    expect((wrapper.vm as any).cellSelectionData.currentCell).toMatchObject({
      rowKey: '1',
      colKey: 'a',
    })
  })

  // SEL-03：操作列不参与选区，选区从第一个非操作列开始
  it('table instance: setAllCellSelection skips the operation column', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          { field: '', key: 'op', title: '', width: 50, operationColumn: true },
          ...COLUMNS,
        ],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    ;(wrapper.vm as any).setAllCellSelection()

    await later()

    expect((wrapper.vm as any).cellSelectionRangeData).toEqual({
      bottomRowKey: '5',
      leftColKey: 'a',
      rightColKey: 'd',
      topRowKey: '1',
    })
  })

  it('table instance: getRangeCellSelection method', async () => {
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

    const selectionTd = wrapper
      .findAll('.ve-table-body-tr')[1]
      .findAll('.ve-table-body-td')[0]

    expect(selectionTd.classes()).toContain('ve-table-cell-selection')
    expect((wrapper.vm as any).cellSelectionRangeData).toEqual({
      bottomRowKey: '5',
      leftColKey: 'a',
      rightColKey: 'c',
      topRowKey: '2',
    })

    const rangeCellSelection = (wrapper.vm as any).getRangeCellSelection()
    expect(rangeCellSelection).toEqual({
      selectionRangeIndexes: {
        endColIndex: 2,
        endRowIndex: 4,
        startColIndex: 0,
        startRowIndex: 1,
      },
      selectionRangeKeys: {
        endColKey: 'c',
        endRowKey: '5',
        startColKey: 'a',
        startRowKey: '2',
      },
    })
  })

  /* it("virtual scroll keyboard events", async () => {
        const mockFn = vi.fn();

        let tableData = [];

        for (let i = 0; i < 500; i++) {
            tableData.push({
                rowKey: i,
                col1: i,
                col2: i,
                col3: i,
                col4: i,
                col5: i,
                col6: i,
                col7: i,
                col8: i,
                col9: i,
                col10: i
            });
        }

        const wrapper = mount(veTable, {
            propsData: {
                columns: [
                    {
                        field: "col1",
                        key: "a",
                        title: "col1",
                        width: 50,
                        fixed: "left"
                    },
                    {
                        title: "col2-col3",
                        fixed: "left",
                        children: [
                            {
                                field: "col2",
                                key: "b",
                                title: "col2",
                                width: 50
                            },
                            {
                                field: "col3",
                                key: "c",
                                title: "col3",
                                width: 50
                            }
                        ]
                    },
                    {
                        title: "col4-col5-col6",
                        children: [
                            {
                                title: "col4-col5",
                                children: [
                                    {
                                        field: "col4",
                                        key: "d",
                                        title: "col4",
                                        width: 130
                                    },
                                    {
                                        field: "col5",
                                        key: "e",
                                        title: "col5",
                                        width: 140
                                    }
                                ]
                            },
                            {
                                title: "col6",
                                field: "col6",
                                key: "f",
                                width: 140
                            }
                        ]
                    },
                    {
                        field: "col7",
                        key: "g",
                        title: "col7",
                        width: 50,
                        fixed: "right"
                    },
                    {
                        field: "col8",
                        key: "h",
                        title: "col8",
                        width: 50,
                        fixed: "right"
                    }
                ],
                tableData: tableData,
                virtualScrollOption: {
                    enable: true
                },
                cellSelectionOption: {
                    // default true
                    enable: true
                },
                maxHeight: 500,
                rowKeyFieldName: "rowKey"
            }
        });

        expect(wrapper.html()).toMatchSnapshot();

        await later();

        expect(wrapper.find(".ve-table-cell-selection").exists()).toBe(false);

        const firstTrTdEl = wrapper
            .findAll(".ve-table-body-tr")[0]
            .findAll(".ve-table-body-td")[2];

        firstTrTdEl.trigger("click");

        await later(3000);
        expect(firstTrTdEl.classes()).toContain("ve-table-cell-selection");

        document.addEventListener("keydown", mockFn);
        document.dispatchEvent(
            new KeyboardEvent("keydown", { keyCode: KEY_CODES.DOWN })
        );

        await later();
        expect(mockFn).toBeCalled();
        expect(firstTrTdEl.find(".ve-table-cell-selection").exists()).toBe(
            false
        );
    }); */
})
