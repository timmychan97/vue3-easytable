import veTable from '@/ve-table'
import { later, wrapMount as mount } from '@test-utils'
import { KEY_CODES } from '@test-utils/constant'
import { expect } from 'vitest'

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

    it('columnToVisible tolerates a missing column', () => {
      const wrapper = mountWithXScrollBar()
      expect(() => (wrapper.vm as any).columnToVisible(undefined)).not.toThrow()
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
