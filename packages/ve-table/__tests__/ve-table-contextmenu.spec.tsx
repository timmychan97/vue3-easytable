import veTable from '@/ve-table'
import { later, wrapMount as mount } from '@test-utils'
import { cloneDeep } from 'lodash'

describe('veTable contextmenu', () => {
  const TABLE_DATA = [
    {
      name: 'John',
      date: '1900-05-20',
      number: '32',
      address: 'No.1 Century Avenue, Shanghai',
      rowKey: 0,
    },
    {
      name: 'Dickerson',
      date: '1910-06-20',
      number: '676',
      address: 'No.1 Century Avenue, Beijing',
      rowKey: 1,
    },
    {
      name: 'Larsen',
      date: '2000-07-20',
      number: '76',
      address: 'No.1 Century Avenue, Chongqing',
      rowKey: 2,
    },
    {
      name: 'Geneva',
      date: '2010-08-20',
      number: '7797',
      address: 'No.1 Century Avenue, Xiamen',
      rowKey: 3,
    },
    {
      name: 'Jami',
      date: '2020-09-20',
      number: '8978',
      address: 'No.1 Century Avenue, Shenzhen',
      rowKey: 4,
    },
  ]

  const COLUMNS = [
    {
      field: '',
      key: 'a',
      title: '',
      width: 50,
      align: 'center',
      operationColumn: true,
      renderBodyCell: ({ _row, _column, rowIndex }, _h) => {
        return ++rowIndex
      },
    },
    {
      field: 'name',
      key: 'name',
      title: 'Name',
      align: 'left',
      width: '15%',
    },
    {
      field: 'date',
      key: 'date',
      title: 'Date',
      align: 'left',
      width: '15%',
    },
    {
      field: 'number',
      key: 'number',
      title: 'Number',
      align: 'right',
      width: '30%',
    },
    {
      field: 'address',
      key: 'address',
      title: 'Address',
      align: 'left',
      width: '40%',
    },
  ]

  const HEADER_CONTEXTMENUS = [
    {
      type: 'CUT',
    },
    {
      type: 'COPY',
    },
    {
      type: 'SEPARATOR',
    },
    {
      type: 'EMPTY_COLUMN',
    },
    {
      type: 'SEPARATOR',
    },
    {
      type: 'LEFT_FIXED_COLUMN_TO',
    },
    {
      type: 'CANCEL_LEFT_FIXED_COLUMN_TO',
    },
    {
      type: 'RIGHT_FIXED_COLUMN_TO',
    },
    {
      type: 'CANCEL_RIGHT_FIXED_COLUMN_TO',
    },
  ]

  const BODY_CONTEXTMENUS = [
    {
      type: 'CUT',
    },
    {
      type: 'COPY',
    },
    {
      type: 'SEPARATOR',
    },
    {
      type: 'INSERT_ROW_ABOVE',
    },
    {
      type: 'INSERT_ROW_BELOW',
    },
    {
      type: 'SEPARATOR',
    },
    {
      type: 'REMOVE_ROW',
    },
    {
      type: 'EMPTY_ROW',
    },
    {
      type: 'EMPTY_CELL',
    },
  ]

  // 弹出层由 <Teleport> 渲染，组件卸载时由 Vue 移除（MOD-09），用例结束后组件自动卸载（tests/utils/auto-unmount.ts），
  // 所以不再手动删除节点（那样会删除 Vue 管理的 DOM）。这里检查 body 中没有遗留的节点
  let bodyChildCount: number | undefined
  beforeEach(() => {
    bodyChildCount ??= document.body.children.length
    expect(document.body.children.length).toBe(bodyChildCount)
  })
  afterAll(() => {
    expect(document.body.children.length).toBe(bodyChildCount)
  })

  it('render', () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        contextmenuHeaderOption: {
          beforeShow: ({
            _isWholeRowSelection,
            _selectionRangeKeys,
            _selectionRangeIndexes,
          }) => {},
          afterMenuClick: ({
            _type,
            _selectionRangeKeys,
            _selectionRangeIndexes,
          }) => {},
          contextmenus: HEADER_CONTEXTMENUS,
        },
        contextmenuBodyOption: {
          beforeShow: ({
            _isWholeRowSelection,
            _selectionRangeKeys,
            _selectionRangeIndexes,
          }) => {},
          afterMenuClick: ({
            _type,
            _selectionRangeKeys,
            _selectionRangeIndexes,
          }) => {},
          contextmenus: BODY_CONTEXTMENUS,
        },
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('header contextmenu beforeShow callback', async () => {
    const mockBeforeShowFn = vi.fn()

    const tableData = cloneDeep(TABLE_DATA)

    const WRAPPER = mount(
      {
        render() {
          return (
            <div>
              <ve-table
                row-key-field-name="rowKey"
                columns={COLUMNS}
                table-data={tableData}
                contextmenu-header-option={
                  this.contextmenuHeaderOption
                }
              />
            </div>
          )
        },
        data() {
          return {
            contextmenuHeaderOption: {
              beforeShow: ({
                isWholeColSelection,
                selectionRangeKeys,
                selectionRangeIndexes,
              }: {
                isWholeColSelection: boolean
                selectionRangeKeys: Record<string, unknown>
                selectionRangeIndexes: Record<string, unknown>
              }) => {
                mockBeforeShowFn({
                  isWholeColSelection,
                  selectionRangeKeys,
                  selectionRangeIndexes,
                })
              },
              afterMenuClick: ({
                _type,
                _selectionRangeKeys,
                _selectionRangeIndexes,
              }) => {
                //
              },
              contextmenus: HEADER_CONTEXTMENUS,
            },
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const firstTrThEl = WRAPPER.findAll('.ve-table-header-tr')[0]
      .findAll('.ve-table-header-th')[1]

    firstTrThEl.trigger('mousedown', {
      button: 3,
    })
    await later()
    firstTrThEl.trigger('contextmenu')
    await later()

    const contextmenuNodes = document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node',
    )

    expect(contextmenuNodes.length).toBe(7)

    expect(mockBeforeShowFn).toHaveBeenCalledWith({
      isWholeColSelection: true,
      selectionRangeKeys: {
        endColKey: 'name',
        endRowKey: 4,
        startColKey: 'name',
        startRowKey: 0,
      },
      selectionRangeIndexes: {
        endColIndex: 1,
        endRowIndex: 4,
        startColIndex: 1,
        startRowIndex: 0,
      },
    })
  })

  it('header contextmenu afterMenuClick callback', async () => {
    const mockAfterMenuClickFn = vi.fn()

    const tableData = cloneDeep(TABLE_DATA)

    const WRAPPER = mount(
      {
        render() {
          return (
            <div>
              <ve-table
                row-key-field-name="rowKey"
                columns={COLUMNS}
                table-data={tableData}
                contextmenu-header-option={
                  this.contextmenuHeaderOption
                }
              />
            </div>
          )
        },
        data() {
          return {
            contextmenuHeaderOption: {
              beforeShow: ({
                _isWholeColSelection,
                _selectionRangeKeys,
                _selectionRangeIndexes,
              }) => {
                //
              },
              afterMenuClick: ({
                type,
                selectionRangeKeys,
                selectionRangeIndexes,
              }: {
                type: string
                selectionRangeKeys: Record<string, unknown>
                selectionRangeIndexes: Record<string, unknown>
              }) => {
                mockAfterMenuClickFn({
                  type,
                  selectionRangeKeys,
                  selectionRangeIndexes,
                })
              },
              contextmenus: HEADER_CONTEXTMENUS,
            },
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const firstTrThEl = WRAPPER.findAll('.ve-table-header-tr')[0]
      .findAll('.ve-table-header-th')[1]

    firstTrThEl.trigger('mousedown', {
      button: 3,
    })
    await later()
    firstTrThEl.trigger('contextmenu')
    await later()

    const contextmenuNodes = document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node',
    )

    expect(contextmenuNodes.length).toBe(7)

    const contentmenuItemClickEvent = new MouseEvent('click', {
      // view: window, // window
      bubbles: true,
      cancelable: true,
    })

    contextmenuNodes[2].dispatchEvent(contentmenuItemClickEvent)

    await later()

    expect(mockAfterMenuClickFn).toHaveBeenCalledWith({
      type: 'EMPTY_COLUMN',
      selectionRangeKeys: {
        endColKey: 'name',
        endRowKey: 4,
        startColKey: 'name',
        startRowKey: 0,
      },
      selectionRangeIndexes: {
        endColIndex: 1,
        endRowIndex: 4,
        startColIndex: 1,
        startRowIndex: 0,
      },
    })
  })

  // 已左固定的列执行“右固定列至”：菜单项应禁用，且强行执行时不报错、列不变
  it('header contextmenu right fixed column to on a left fixed column', async () => {
    const errorHandler = vi.fn()

    const columns = COLUMNS.map(column =>
      ['a', 'name'].includes(column.key)
        ? { ...column, fixed: 'left' }
        : column,
    )

    const WRAPPER = mount(
      {
        render() {
          return (
            <div>
              <ve-table
                row-key-field-name="rowKey"
                columns={columns}
                table-data={cloneDeep(TABLE_DATA)}
                contextmenu-header-option={{
                  contextmenus: HEADER_CONTEXTMENUS,
                }}
              />
            </div>
          )
        },
      },
      { global: { config: { errorHandler } } },
    )

    const nameThEl = WRAPPER.findAll('.ve-table-header-tr')[0]
      .findAll('.ve-table-header-th')[1]

    nameThEl.trigger('mousedown', {
      button: 3,
    })
    await later()
    nameThEl.trigger('contextmenu')
    await later()

    const contextmenuNodes = document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node',
    )

    // CUT, COPY, EMPTY_COLUMN, LEFT_FIXED, CANCEL_LEFT_FIXED, RIGHT_FIXED, CANCEL_RIGHT_FIXED
    expect(contextmenuNodes.length).toBe(7)
    expect(contextmenuNodes[3].classList).not.toContain(
      've-contextmenu-node-disabled',
    )
    expect(contextmenuNodes[5].classList).toContain(
      've-contextmenu-node-disabled',
    )

    // 绕过禁用状态，直接执行菜单动作
    const tableVm = WRAPPER.findComponent({ name: 'VeTable' }).vm as any
    tableVm.contextmenuItemClick('RIGHT_FIXED_COLUMN_TO')
    await later()

    expect(errorHandler).not.toHaveBeenCalled()
    expect(Array.isArray(tableVm.cloneColumns)).toBe(true)
    expect(tableVm.cloneColumns.map(x => x.fixed)).toEqual([
      'left',
      'left',
      undefined,
      undefined,
      undefined,
    ])
    expect(
      WRAPPER.findAll('.ve-table-header-tr')[0].findAll('.ve-table-header-th')
        .length,
    ).toBe(5)

    WRAPPER.unmount()
  })

  it('body contextmenu beforeShow callback', async () => {
    const mockBeforeShowFn = vi.fn()

    const tableData = cloneDeep(TABLE_DATA)

    const WRAPPER = mount(
      {
        render() {
          return (
            <div>
              <ve-table
                row-key-field-name="rowKey"
                columns={COLUMNS}
                table-data={tableData}
                contextmenu-body-option={
                  this.contextmenuBodyOption
                }
              />
            </div>
          )
        },
        data() {
          return {
            contextmenuBodyOption: {
              beforeShow: ({
                isWholeRowSelection,
                selectionRangeKeys,
                selectionRangeIndexes,
              }) => {
                mockBeforeShowFn({
                  isWholeRowSelection,
                  selectionRangeKeys,
                  selectionRangeIndexes,
                })
              },
              afterMenuClick: ({
                _type,
                _selectionRangeKeys,
                _selectionRangeIndexes,
              }) => {
                //
              },
              contextmenus: BODY_CONTEXTMENUS,
            },
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown', {
      button: 3,
    })
    await later()
    firstTrTdEl.trigger('contextmenu')
    await later()

    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    const contextmenuNodes = document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node',
    )

    expect(contextmenuNodes.length).toBe(6)

    expect(mockBeforeShowFn).toHaveBeenCalledWith({
      isWholeRowSelection: false,
      selectionRangeKeys: {
        endColKey: 'date',
        endRowKey: 2,
        startColKey: 'date',
        startRowKey: 2,
      },
      selectionRangeIndexes: {
        endColIndex: 2,
        endRowIndex: 2,
        startColIndex: 2,
        startRowIndex: 2,
      },
    })
  })

  it('body contextmenu afterMenuClick callback', async () => {
    const mockAfterMenuClickFn = vi.fn()

    const tableData = cloneDeep(TABLE_DATA)

    const WRAPPER = mount(
      {
        render() {
          return (
            <div>
              <ve-table
                row-key-field-name="rowKey"
                columns={COLUMNS}
                table-data={tableData}
                contextmenu-body-option={
                  this.contextmenuBodyOption
                }
              />
            </div>
          )
        },
        data() {
          return {
            contextmenuBodyOption: {
              beforeShow: ({
                _isWholeColSelection,
                _selectionRangeKeys,
                _selectionRangeIndexes,
              }) => {
                //
              },
              afterMenuClick: ({
                type,
                selectionRangeKeys,
                selectionRangeIndexes,
              }: {
                type: string
                selectionRangeKeys: Record<string, unknown>
                selectionRangeIndexes: Record<string, unknown>
              }) => {
                mockAfterMenuClickFn({
                  type,
                  selectionRangeKeys,
                  selectionRangeIndexes,
                })
              },
              contextmenus: BODY_CONTEXTMENUS,
            },
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const firstTrTdEl = WRAPPER.findAll('.ve-table-body-tr')[2]
      .findAll('.ve-table-body-td')[2]

    firstTrTdEl.trigger('mousedown', {
      button: 3,
    })
    await later()
    firstTrTdEl.trigger('contextmenu')
    await later()

    expect(firstTrTdEl.classes()).toContain('ve-table-cell-selection')

    const contextmenuNodes = document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node',
    )

    expect(contextmenuNodes.length).toBe(6)

    const contentmenuItemClickEvent = new MouseEvent('click', {
      // view: window, // window
      bubbles: true,
      cancelable: true,
    })

    contextmenuNodes[2].dispatchEvent(contentmenuItemClickEvent)

    await later()

    expect(mockAfterMenuClickFn).toHaveBeenCalledWith({
      type: 'INSERT_ROW_ABOVE',
      selectionRangeKeys: {
        endColKey: 'date',
        endRowKey: 2,
        startColKey: 'date',
        startRowKey: 2,
      },
      selectionRangeIndexes: {
        endColIndex: 2,
        endRowIndex: 2,
        startColIndex: 2,
        startRowIndex: 2,
      },
    })
  })

  // 单元格的 contextmenu 处理函数会同步替换 options，事件随后冒泡到 .ve-table-content 打开菜单。
  // 脚本派发的事件（测试工具、dispatchEvent）在两个监听器之间没有微任务检查点，
  // 菜单必须等 options 更新渲染完成后再显示，否则会显示在即将被移除的旧容器里
  it('the menu stays open after repeated right-clicks on body and header cells (MENU-06)', async () => {
    // 前面的用例没有卸载表格，会留下空的 popper 容器
    const poppersBefore = document.querySelectorAll('.ve-contextmenu-popper').length
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: cloneDeep(TABLE_DATA),
        rowKeyFieldName: 'rowKey',
        contextmenuHeaderOption: { contextmenus: HEADER_CONTEXTMENUS },
        contextmenuBodyOption: { contextmenus: BODY_CONTEXTMENUS },
      },
    })

    const rightClick = async (el: any) => {
      el.trigger('mousedown', { button: 2 })
      await later()
      el.trigger('contextmenu')
      await later()
    }
    const visibleLabels = () => [...document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node-label',
    )].map(x => x.textContent)

    const bodyTrs = wrapper.findAll('.ve-table-body-tr')

    // 第一次右键（options 从空数组变为菜单项）
    await rightClick(bodyTrs[2].findAll('.ve-table-body-td')[2])
    expect(visibleLabels()).toHaveLength(6)
    expect(visibleLabels()).toContain('删除 1 行')

    // 再次右键（options 被替换为新的数组）
    await rightClick(bodyTrs[3].findAll('.ve-table-body-td')[3])
    expect(visibleLabels()).toHaveLength(6)
    expect(document.querySelectorAll('.ve-contextmenu-popper')).toHaveLength(poppersBefore + 1)

    // 切换到表头菜单
    await rightClick(wrapper.findAll('.ve-table-header-th')[1])
    expect(visibleLabels()).toHaveLength(7)
    expect(visibleLabels()).toContain('清空 1 列')

    wrapper.unmount()
    expect(document.querySelectorAll('.ve-contextmenu-popper')).toHaveLength(poppersBefore)
  })

  // it("contextmenu INSERT_ROW_ABOVE", async () => {
  //     const mockFn = vi.fn();

  //     let tableData = cloneDeep(TABLE_DATA);

  //     const WRAPPER = mount(
  //         {
  //             render() {
  //                 return (
  //                     <div>
  //                         <ve-table
  //                             row-key-field-name="rowKey"
  //                             columns={COLUMNS}
  //                             table-data={tableData}
  //                             contextmenu-body-option={
  //                                 this.contextmenuBodyOption
  //                             }
  //                         />
  //                     </div>
  //                 );
  //             },
  //             data() {
  //                 return {
  //                     contextmenuBodyOption: {
  //                         beforeShow: ({
  //                             isWholeRowSelection,
  //                             selectionRangeKeys,
  //                             selectionRangeIndexes,
  //                         }) => {
  //                             console.log("before show");
  //                         },
  //                         afterMenuClick: ({
  //                             type,
  //                             selectionRangeKeys,
  //                             selectionRangeIndexes,
  //                         }) => {
  //                             mockFn({
  //                                 type,
  //                                 selectionRangeKeys,
  //                                 selectionRangeIndexes,
  //                             });
  //                         },
  //                         contextmenus: BODY_CONTEXTMENUS,
  //                     },
  //                 };
  //             },
  //         },
  //         // need attach to documnet
  //         { attachTo: document.body },
  //     );

  //     const firstTrTdEl = WRAPPER.findAll(".ve-table-body-tr")
  //         [2]
  //         .findAll(".ve-table-body-td")
  //         [2];

  //     firstTrTdEl.trigger("mousedown", {
  //         button: 3,
  //     });
  //     await later();
  //     firstTrTdEl.trigger("contextmenu");
  //     await later();

  //     expect(firstTrTdEl.classes()).toContain("ve-table-cell-selection");

  //     //const tableVm = WRAPPER.findComponent({ name: "ve-table" }).vm;

  //     const contextmenuNodes = document.querySelectorAll(
  //         ".ve-contextmenu-node",
  //     );

  //     expect(contextmenuNodes.length).toBe(6);

  //     const contentmenuItemClickEvent = new MouseEvent("click", {
  //         view: window, // window
  //         bubbles: true,
  //         cancelable: true,
  //     });

  //     contextmenuNodes[2].dispatchEvent(contentmenuItemClickEvent);

  //     await later();

  //     expect(tableData.length).toBe(6);

  //     expect(mockFn).toHaveBeenCalled();
  //     // expect(mockFn).toHaveBeenCalledWith({
  //     //     selectionRangeKeys,
  //     //     selectionRangeIndexes,
  //     //     //selection: { colKey: "date", rowKey: 2, rowIndex: 2 },
  //     //     type: "INSERT_ROW_ABOVE",
  //     // });
  // });

  // it("contextmenu INSERT_ROW_BELOW", async () => {
  //     const mockFn = vi.fn();

  //     let tableData = cloneDeep(TABLE_DATA);

  //     const WRAPPER = mount(
  //         {
  //             render() {
  //                 return (
  //                     <div>
  //                         <ve-table
  //                             row-key-field-name="rowKey"
  //                             columns={COLUMNS}
  //                             table-data={tableData}
  //                             contextmenu-body-option={
  //                                 this.contextmenuBodyOption
  //                             }
  //                         />
  //                     </div>
  //                 );
  //             },
  //             data() {
  //                 return {
  //                     contextmenuBodyOption: {
  //                         afterMenuClick: ({
  //                             type,
  //                             selectionRangeKeys,
  //                             selectionRangeIndexes,
  //                         }) => {
  //                             mockFn({
  //                                 type,
  //                                 selectionRangeKeys,
  //                                 selectionRangeIndexes,
  //                             });
  //                         },
  //                         contextmenus: BODY_CONTEXTMENUS,
  //                     },
  //                 };
  //             },
  //         },
  //         // need attach to documnet
  //         { attachTo: document.body },
  //     );

  //     const firstTrTdEl = WRAPPER.findAll(".ve-table-body-tr")
  //         [2]
  //         .findAll(".ve-table-body-td")
  //         [2];

  //     firstTrTdEl.trigger("contextmenu");
  //     firstTrTdEl.trigger("mousedown", {
  //         button: 3,
  //     });
  //     await later();

  //     expect(firstTrTdEl.classes()).toContain("ve-table-cell-selection");

  //     const bodyEl = WRAPPER.find(".ve-table-body");
  //     bodyEl.trigger("contextmenu");

  //     await later();

  //     const contextmenuPopper = document.querySelector(
  //         ".ve-contextmenu-popper",
  //     );

  //     const contextmenuNodes = contextmenuPopper.querySelectorAll(
  //         ".ve-contextmenu-node",
  //     );

  //     const contentmenuItemClickEvent = new MouseEvent("click", {
  //         view: window, // window
  //         bubbles: true,
  //         cancelable: true,
  //     });

  //     contextmenuNodes[1].dispatchEvent(contentmenuItemClickEvent);

  //     await later();

  //     expect(tableData.length).toBe(6);

  //     expect(mockFn).toHaveBeenCalled();
  //     expect(mockFn).toHaveBeenCalledWith({
  //         selection: { colKey: "date", rowKey: 2, rowIndex: 2 },
  //         type: "INSERT_ROW_BELOW",
  //     });
  // });

  // it("contextmenu REMOVE_ROW", async () => {
  //     const mockFn = vi.fn();

  //     let tableData = cloneDeep(TABLE_DATA);

  //     const WRAPPER = mount(
  //         {
  //             render() {
  //                 return (
  //                     <div>
  //                         <ve-table
  //                             row-key-field-name="rowKey"
  //                             columns={COLUMNS}
  //                             table-data={tableData}
  //                             contextmenu-body-option={
  //                                 this.contextmenuBodyOption
  //                             }
  //                         />
  //                     </div>
  //                 );
  //             },
  //             data() {
  //                 return {
  //                     contextmenuBodyOption: {
  //                         afterMenuClick: ({
  //                             type,
  //                             selectionRangeKeys,
  //                             selectionRangeIndexes,
  //                         }) => {
  //                             mockFn({
  //                                 type,
  //                                 selectionRangeKeys,
  //                                 selectionRangeIndexes,
  //                             });
  //                         },
  //                         contextmenus: BODY_CONTEXTMENUS,
  //                     },
  //                 };
  //             },
  //         },
  //         // need attach to documnet
  //         { attachTo: document.body },
  //     );

  //     const firstTrTdEl = WRAPPER.findAll(".ve-table-body-tr")
  //         [2]
  //         .findAll(".ve-table-body-td")
  //         [2];

  //     firstTrTdEl.trigger("mousedown");

  //     await later();

  //     expect(firstTrTdEl.classes()).toContain("ve-table-cell-selection");

  //     const bodyEl = WRAPPER.find(".ve-table-body");
  //     bodyEl.trigger("contextmenu");

  //     await later();

  //     const contextmenuPopper = document.querySelector(
  //         ".ve-contextmenu-popper",
  //     );

  //     const contextmenuNodes = contextmenuPopper.querySelectorAll(
  //         ".ve-contextmenu-node",
  //     );

  //     const contentmenuItemClickEvent = new MouseEvent("click", {
  //         view: window, // window
  //         bubbles: true,
  //         cancelable: true,
  //     });

  //     contextmenuNodes[2].dispatchEvent(contentmenuItemClickEvent);

  //     await later();

  //     expect(tableData.length).toBe(4);

  //     expect(mockFn).toHaveBeenCalled();
  //     expect(mockFn).toHaveBeenCalledWith({
  //         selectionRangeKeys,
  //         selectionRangeIndexes,
  //         //selection: { colKey: "date", rowKey: 2, rowIndex: 2 },
  //         type: "REMOVE_ROW",
  //     });
  // });

  // it("contextmenu HIDE_COLUMN", async () => {
  //     const mockFn = vi.fn();

  //     let tableData = cloneDeep(TABLE_DATA);

  //     const WRAPPER = mount(
  //         {
  //             render() {
  //                 return (
  //                     <div>
  //                         <ve-table
  //                             row-key-field-name="rowKey"
  //                             columns={COLUMNS}
  //                             table-data={tableData}
  //                             contextmenu-body-option={
  //                                 this.contextmenuBodyOption
  //                             }
  //                         />
  //                     </div>
  //                 );
  //             },
  //             data() {
  //                 return {
  //                     contextmenuBodyOption: {
  //                         afterMenuClick: ({
  //                             type,
  //                             selectionRangeKeys,
  //                             selectionRangeIndexes,
  //                         }) => {
  //                             mockFn({
  //                                 type,
  //                                 selectionRangeKeys,
  //                                 selectionRangeIndexes,
  //                             });
  //                         },
  //                         contextmenus: BODY_CONTEXTMENUS,
  //                     },
  //                 };
  //             },
  //         },
  //         // need attach to documnet
  //         { attachTo: document.body },
  //     );

  //     const firstTrTdEl = WRAPPER.findAll(".ve-table-body-tr")
  //         [2]
  //         .findAll(".ve-table-body-td")
  //         [2];

  //     firstTrTdEl.trigger("mousedown");

  //     await later();

  //     expect(firstTrTdEl.classes()).toContain("ve-table-cell-selection");

  //     const bodyEl = WRAPPER.find(".ve-table-body");
  //     bodyEl.trigger("contextmenu");

  //     await later();

  //     const DateTh = WRAPPER.findAll(
  //         ".ve-table-header-tr .ve-table-header-th",
  //     )[2];
  //     expect(DateTh.text()).toBe("Date");

  //     const contextmenuPopper = document.querySelector(
  //         ".ve-contextmenu-popper",
  //     );

  //     const contextmenuNodes = contextmenuPopper.querySelectorAll(
  //         ".ve-contextmenu-node",
  //     );

  //     const contentmenuItemClickEvent = new MouseEvent("click", {
  //         view: window, // window
  //         bubbles: true,
  //         cancelable: true,
  //     });

  //     contextmenuNodes[3].dispatchEvent(contentmenuItemClickEvent);

  //     await later();

  //     const DateTh2 = WRAPPER.findAll(
  //         ".ve-table-header-tr .ve-table-header-th",
  //     )[2];
  //     expect(DateTh2.text()).toBe("Number");

  //     expect(mockFn).toHaveBeenCalled();
  //     expect(mockFn).toHaveBeenCalledWith({
  //         selectionRangeKeys,
  //         selectionRangeIndexes,
  //         type: "HIDE_COLUMN",
  //     });
  // });
})
