/*
单元格自动填充（autofill）：
- 填充方向由选区与结束单元格的位置计算，不再是渲染副作用（FILL-01）
- 在表格外 / 窗口外释放鼠标、窗口失焦时取消填充（FILL-02）；拖动期间点击右键菜单项也取消（FILL-07）
- 选区边框几何计算不修改共享对象，区域浮层与边框围成的矩形一致（SEL-07）
- 设置了 editOption 时只填充 edit: true 的列，并逐单元格调用编辑回调（FILL-03，D12）
- 操作列、没有 field 的列不被填充（FILL-04）
*/

import veContextmenu from '@/ve-contextmenu'
import veTable from '@/ve-table'
import {
  adjustSelectionBorders,
  getAreaLayerRect,
  getAutofillDirection,
} from '@/ve-table/src/selection/geometry'
import { HOOKS_NAME } from '@/ve-table/src/util/constant'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import { toRaw } from 'vue'

// 布局模拟：表头高 40，每行高 40，每列宽 100（按列顺序从 0 开始排列）
const HEADER_HEIGHT = 40
const ROW_HEIGHT = 40
const COL_WIDTH = 100

const TABLE_DATA = [
  { rowKey: 'r1', name: 'n1', date: 'd1', hobby: 'h1', address: 'a1' },
  { rowKey: 'r2', name: 'n2', date: 'd2', hobby: 'h2', address: 'a2' },
  { rowKey: 'r3', name: 'n3', date: 'd3', hobby: 'h3', address: 'a3' },
  { rowKey: 'r4', name: 'n4', date: 'd4', hobby: 'h4', address: 'a4' },
  { rowKey: 'r5', name: 'n5', date: 'd5', hobby: 'h5', address: 'a5' },
]
const ROW_KEYS = TABLE_DATA.map(x => x.rowKey)

const COLUMNS: Record<string, any>[] = [
  { field: 'name', key: 'name', title: 'Name', width: COL_WIDTH },
  { field: 'date', key: 'date', title: 'Date', width: COL_WIDTH },
  { field: 'hobby', key: 'hobby', title: 'Hobby', width: COL_WIDTH },
  { field: 'address', key: 'address', title: 'Address', width: COL_WIDTH },
]
const COL_KEYS = COLUMNS.map(x => x.key)

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this
    },
  } as DOMRect
}

// jsdom 没有布局：按行列位置返回单元格矩形，其他元素返回一个容纳整个表格的矩形
function mockTableLayout(colKeys: string[] = COL_KEYS) {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.tagName === 'TD' && this.hasAttribute('col-key')) {
      const colIndex = colKeys.indexOf(this.getAttribute('col-key')!)
      const rowIndex = ROW_KEYS.indexOf(this.closest('tr')!.getAttribute('row-key')!)
      return rect(colIndex * COL_WIDTH, HEADER_HEIGHT + rowIndex * ROW_HEIGHT, COL_WIDTH, ROW_HEIGHT)
    }
    return rect(0, 0, 1000, 500)
  })
}

describe('veTable cell autofill', () => {
  let wrapper: any = null
  let vueErrors: unknown[] = []

  function mountTable(props: Record<string, any> = {}) {
    vueErrors = []
    wrapper = mount(veTable, {
      props: {
        columns: cloneDeep(COLUMNS),
        tableData: cloneDeep(TABLE_DATA),
        rowKeyFieldName: 'rowKey',
        ...props,
      },
      attachTo: document.body,
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

  function rowOf(rowKey: string) {
    return wrapper.props('tableData').find((x: any) => x.rowKey === rowKey)
  }

  function td(rowKey: string, colKey: string) {
    return wrapper.find(`tr[row-key="${rowKey}"] td[col-key="${colKey}"]`)
  }

  // 可见的选区角标（固定列区域没有选区时不渲染）
  function visibleCorner() {
    const corner = wrapper
      .findAll('.ve-table-selection-corner')
      .find((x: any) => x.element.style.display !== 'none')
    expect(corner).toBeTruthy()
    return corner
  }

  // 鼠标左键点击单元格（会清除之前的区域选择）
  async function select(rowKey: string, colKey: string) {
    await td(rowKey, colKey).trigger('mousedown', { button: 0, buttons: 1 })
    await wrapper.find('.ve-table-container').trigger('mouseup')
    await later()
  }

  async function selectRange(startRowKey: string, startColKey: string, endRowKey: string, endColKey: string) {
    wrapper.vm.setRangeCellSelection({ startRowKey, startColKey, endRowKey, endColKey })
    await later()
  }

  // 按下角标，按住左键依次经过给定单元格
  async function dragCorner(...cells: [string, string][]) {
    await visibleCorner().trigger('mousedown', { buttons: 1 })
    for (const [rowKey, colKey] of cells)
      await td(rowKey, colKey).trigger('mouseover', { buttons: 1 })
    await later()
  }

  // 在表格内释放（事件顺序：单元格 → 容器 → window）
  async function releaseInTable(rowKey: string, colKey: string) {
    const target = td(rowKey, colKey).element as HTMLElement
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 50, clientY: 50 }))
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }))
    await later()
  }

  async function fill(from: [string, string], ...path: [string, string][]) {
    await select(...from)
    await dragCorner(...path)
    await releaseInTable(...path[path.length - 1])
  }

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
  })

  describe('getAutofillDirection (FILL-01)', () => {
    const range = { top: 1, bottom: 2, left: 1, right: 2 }

    it('returns the side of the range the end cell is on', () => {
      expect(getAutofillDirection({ range, endRowIndex: 4, endColIndex: 1 })).toBe('down')
      expect(getAutofillDirection({ range, endRowIndex: 0, endColIndex: 2 })).toBe('up')
      expect(getAutofillDirection({ range, endRowIndex: 1, endColIndex: 3 })).toBe('right')
      expect(getAutofillDirection({ range, endRowIndex: 2, endColIndex: 0 })).toBe('left')
    })

    it('prefers the vertical direction for a diagonal end cell', () => {
      expect(getAutofillDirection({ range, endRowIndex: 4, endColIndex: 3 })).toBe('down')
      expect(getAutofillDirection({ range, endRowIndex: 0, endColIndex: 0 })).toBe('up')
    })

    it('returns null inside the range or for an unknown cell', () => {
      expect(getAutofillDirection({ range, endRowIndex: 1, endColIndex: 2 })).toBeNull()
      expect(getAutofillDirection({ range, endRowIndex: -1, endColIndex: 1 })).toBeNull()
      expect(getAutofillDirection({ range, endRowIndex: 3, endColIndex: -1 })).toBeNull()
      expect(getAutofillDirection({ range: { top: -1, bottom: -1, left: 1, right: 1 }, endRowIndex: 3, endColIndex: 1 })).toBeNull()
    })

    it('returns null for a disallowed direction instead of falling back to another one', () => {
      expect(getAutofillDirection({ range, endRowIndex: 4, endColIndex: 3, directionY: false })).toBeNull()
      expect(getAutofillDirection({ range, endRowIndex: 1, endColIndex: 3, directionY: false })).toBe('right')
      expect(getAutofillDirection({ range, endRowIndex: 1, endColIndex: 3, directionX: false })).toBeNull()
      expect(getAutofillDirection({ range, endRowIndex: 4, endColIndex: 1, directionX: false })).toBe('down')
    })
  })

  describe('autofill direction (FILL-01)', () => {
    it('fills down from a single cell', async () => {
      mockTableLayout()
      const afterAutofill = vi.fn()
      mountTable({ cellAutofillOption: { afterAutofill } })

      await fill(['r1', 'name'], ['r2', 'name'], ['r3', 'name'])

      expect(vueErrors).toEqual([])
      expect([rowOf('r2').name, rowOf('r3').name, rowOf('r4').name]).toEqual(['n1', 'n1', 'n4'])
      expect(afterAutofill).toHaveBeenCalledTimes(1)
      expect(afterAutofill.mock.calls[0][0].direction).toBe('down')
      expect(wrapper.vm.cellSelectionData.normalEndCell).toEqual({ rowKey: 'r3', colKey: 'name', rowIndex: 2 })
    })

    it('fills right from a range', async () => {
      mockTableLayout()
      mountTable({ cellAutofillOption: {} })

      await selectRange('r1', 'name', 'r2', 'date')
      await dragCorner(['r2', 'hobby'], ['r2', 'address'])
      await releaseInTable('r2', 'address')

      expect([rowOf('r1').hobby, rowOf('r1').address, rowOf('r2').hobby, rowOf('r2').address])
        .toEqual(['n1', 'd1', 'n2', 'd2'])
      expect(wrapper.vm.cellSelectionRangeData).toEqual({
        leftColKey: 'name',
        rightColKey: 'address',
        topRowKey: 'r1',
        bottomRowKey: 'r2',
      })
    })

    it('a drag in a disallowed direction calls no callbacks and changes nothing', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      const afterAutofill = vi.fn()
      mountTable({ cellAutofillOption: { directionY: false, beforeAutofill, afterAutofill } })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'], ['r3', 'name'])
      // 不允许的方向不显示填充预览
      expect(wrapper.find('.ve-table-selection-autofill-area').exists()).toBe(false)
      await releaseInTable('r3', 'name')

      expect(vueErrors).toEqual([])
      expect(beforeAutofill).not.toHaveBeenCalled()
      expect(afterAutofill).not.toHaveBeenCalled()
      expect(rowOf('r2').name).toBe('n2')
      expect(wrapper.vm.cellSelectionData.currentCell).toEqual({ rowKey: 'r1', colKey: 'name', rowIndex: 0 })
      expect(wrapper.vm.cellSelectionData.normalEndCell).toEqual({ rowKey: '', colKey: '', rowIndex: -1 })
    })

    it('does not reuse the direction of an earlier fill', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      mountTable({ cellAutofillOption: { directionY: false, beforeAutofill } })

      // 第一次向右填充
      await fill(['r1', 'name'], ['r1', 'date'])
      expect(beforeAutofill).toHaveBeenCalledTimes(1)
      expect(rowOf('r1').date).toBe('n1')

      // 第二次向下拖动（不允许）：不能沿用上一次的 RIGHT
      await select('r3', 'hobby')
      await dragCorner(['r4', 'hobby'], ['r5', 'hobby'])
      await releaseInTable('r5', 'hobby')

      expect(vueErrors).toEqual([])
      expect(beforeAutofill).toHaveBeenCalledTimes(1)
      expect([rowOf('r4').hobby, rowOf('r5').hobby]).toEqual(['h4', 'h5'])
      expect(wrapper.vm.cellSelectionData.currentCell).toEqual({ rowKey: 'r3', colKey: 'hobby', rowIndex: 2 })
      expect(wrapper.vm.cellSelectionData.normalEndCell).toEqual({ rowKey: '', colKey: '', rowIndex: -1 })
    })

    it('the direction is null before a drag and after it ends', async () => {
      mockTableLayout()
      mountTable({ cellAutofillOption: {} })

      await select('r1', 'name')
      expect(wrapper.vm.autofillingDirection).toBeNull()

      await dragCorner(['r2', 'name'])
      expect(wrapper.vm.autofillingDirection).toBe('down')
      // 回到选区内：没有方向
      await td('r1', 'name').trigger('mouseover', { buttons: 1 })
      expect(wrapper.vm.autofillingDirection).toBeNull()

      await td('r1', 'date').trigger('mouseover', { buttons: 1 })
      expect(wrapper.vm.autofillingDirection).toBe('right')
      await releaseInTable('r1', 'date')
      expect(wrapper.vm.autofillingDirection).toBeNull()
      expect(rowOf('r1').date).toBe('n1')
    })

    it('the preview follows the same direction as the commit', async () => {
      mockTableLayout()
      const afterAutofill = vi.fn()
      mountTable({ cellAutofillOption: { afterAutofill } })

      await select('r2', 'date')
      // 斜向（下方且右侧）：纵向优先
      await dragCorner(['r3', 'hobby'])
      const area = wrapper.find('.ve-table-selection-autofill-area')
      expect(area.exists()).toBe(true)
      // 预览只覆盖 date 列：左边框在 date 列左侧，宽度为一列
      const top = area.findAll('.ve-table-selection-border')[0].element as HTMLElement
      expect(top.style.width).toBe(`${COL_WIDTH + 1}px`)

      await releaseInTable('r3', 'hobby')
      expect(afterAutofill.mock.calls[0][0].direction).toBe('down')
      expect([rowOf('r3').date, rowOf('r3').hobby]).toEqual(['d2', 'h3'])
    })
  })

  describe('cancelling an autofill drag (FILL-02)', () => {
    it('releasing outside the table cancels the fill', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      mountTable({ cellAutofillOption: { beforeAutofill } })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'], ['r3', 'name'])

      // 鼠标在表格外（页面内）释放，随后浏览器在公共祖先上触发 click
      const outside = { bubbles: true, clientX: 50, clientY: 900 }
      document.body.dispatchEvent(new MouseEvent('mouseup', outside))
      document.body.dispatchEvent(new MouseEvent('click', outside))
      await later()

      expect(vueErrors).toEqual([])
      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r2').name, rowOf('r3').name]).toEqual(['n2', 'n3'])
      expect(wrapper.vm.isAutofillStarting).toBe(false)
      expect(wrapper.vm.cellSelectionData.autoFillEndCell).toEqual({ rowKey: '', colKey: '' })
    })

    // SEL-11：取消填充，但选区保留（之前公共祖先上的 click 让 tableClickOutside 清除了整个选区）
    it('releasing outside the table keeps the selection (SEL-11)', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      mountTable({ cellAutofillOption: { beforeAutofill } })

      await selectRange('r1', 'name', 'r2', 'date')
      await dragCorner(['r3', 'name'], ['r4', 'name'])

      // 真实的鼠标 click（detail 为 1），在 mouseup 与 mousedown 目标的公共祖先上
      const outside = { bubbles: true, clientX: 50, clientY: 900, detail: 1 }
      document.body.dispatchEvent(new MouseEvent('mouseup', outside))
      document.body.dispatchEvent(new MouseEvent('click', outside))
      await later()

      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r3').name, rowOf('r4').name]).toEqual(['n3', 'n4'])
      expect(wrapper.vm.isAutofillStarting).toBe(false)
      expect(wrapper.vm.cellSelectionData.currentCell).toMatchObject({ rowKey: 'r1', colKey: 'name' })
      expect(wrapper.vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: 'r2', colKey: 'date' })
      expect(wrapper.find('.ve-table-selection-normal-area').exists()).toBe(true)
    })

    it('releasing outside the window cancels the fill', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      mountTable({ cellAutofillOption: { beforeAutofill } })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'], ['r3', 'name'])

      // 窗口外释放时，浏览器把 mouseup 派发给按下时的元素（角标），坐标在表格之外
      const corner = visibleCorner().element as HTMLElement
      corner.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: -40, clientY: -40 }))
      await later()

      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r2').name, rowOf('r3').name]).toEqual(['n2', 'n3'])
      expect(wrapper.vm.isAutofillStarting).toBe(false)
      expect(wrapper.vm.cellSelectionData.autoFillEndCell).toEqual({ rowKey: '', colKey: '' })
    })

    it('a window blur cancels the drag, so a later mouseup commits nothing', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      mountTable({ cellAutofillOption: { beforeAutofill } })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'], ['r3', 'name'])

      window.dispatchEvent(new Event('blur'))
      await later()
      expect(wrapper.vm.isAutofillStarting).toBe(false)

      await releaseInTable('r3', 'name')

      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r2').name, rowOf('r3').name]).toEqual(['n2', 'n3'])
    })

    it('hovering a cell with no button held cancels a drag whose mouseup was lost', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      mountTable({ cellAutofillOption: { beforeAutofill } })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'])

      // mouseup 丢失（例如在窗口外释放且浏览器没有派发），之后鼠标未按下就回到表格
      await td('r3', 'name').trigger('mouseover', { buttons: 0 })
      await later()
      expect(wrapper.vm.isAutofillStarting).toBe(false)

      await releaseInTable('r4', 'name')

      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r2').name, rowOf('r3').name, rowOf('r4').name]).toEqual(['n2', 'n3', 'n4'])
    })

    it('releasing on the table header still commits to the last hovered cell', async () => {
      mockTableLayout()
      mountTable({ cellAutofillOption: {} })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'])

      const th = wrapper.find('th').element as HTMLElement
      th.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 50, clientY: 20 }))
      await later()

      expect(rowOf('r2').name).toBe('n1')
    })

    it('removes its window listeners when the drag ends and on unmount', async () => {
      mockTableLayout()
      const add = vi.spyOn(window, 'addEventListener')
      const remove = vi.spyOn(window, 'removeEventListener')
      mountTable({ cellAutofillOption: {} })

      const added = () => add.mock.calls.filter(([type]) => type === 'mouseup' || type === 'blur')
      const isRemoved = ([type, fn, options]: any[]) =>
        remove.mock.calls.some(([t, f, o]) => t === type && f === fn && !!(o as any)?.capture === !!options?.capture)

      // 拖动结束后移除（每次点击单元格还会加一个拖动选择的 blur 监听，松开时移除，SEL-18）
      await fill(['r1', 'name'], ['r2', 'name'])
      expect(added().length).toBe(3)
      expect(added().every(isRemoved)).toBe(true)

      // 拖动中卸载也要移除
      await select('r1', 'date')
      await dragCorner(['r2', 'date'])
      expect(added().length).toBe(6)
      wrapper.unmount()
      wrapper = null
      expect(added().every(isRemoved)).toBe(true)
    })

    // FILL-07：拖动角标期间打开右键菜单并点击菜单项，取消填充，而不是提交到最后经过的单元格
    it('a contextmenu item click during the drag cancels the fill (FILL-07)', async () => {
      mockTableLayout()
      const beforeAutofill = vi.fn()
      const add = vi.spyOn(window, 'addEventListener')
      const remove = vi.spyOn(window, 'removeEventListener')
      mountTable({
        cellAutofillOption: { beforeAutofill },
        // 返回 false：只测试填充状态，不执行菜单动作
        contextmenuBodyOption: { contextmenus: [{ type: 'CUSTOM' }], afterMenuClick: () => false },
      })

      await select('r1', 'name')
      await dragCorner(['r2', 'name'], ['r3', 'name'])
      expect(wrapper.vm.isAutofillStarting).toBe(true)

      wrapper.findComponent(veContextmenu).vm.$emit('on-node-click', 'CUSTOM')
      await later()

      expect(vueErrors).toEqual([])
      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r2').name, rowOf('r3').name]).toEqual(['n2', 'n3'])
      expect(wrapper.vm.isAutofillStarting).toBe(false)
      expect(wrapper.vm.cellSelectionData.autoFillEndCell).toEqual({ rowKey: '', colKey: '' })
      // 选区没有扩大到填充区域
      expect(wrapper.vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '', colKey: '' })

      // 填充的 window 监听也已移除
      const autofillListeners = add.mock.calls.filter(([type, , options]) =>
        type === 'mouseup' && (options as any)?.capture)
      expect(autofillListeners.length).toBe(1)
      expect(remove.mock.calls.some(([type, fn]) => type === 'mouseup' && fn === autofillListeners[0][1])).toBe(true)

      // 之后在表格内释放也不会提交
      await releaseInTable('r3', 'name')
      expect(beforeAutofill).not.toHaveBeenCalled()
      expect([rowOf('r2').name, rowOf('r3').name]).toEqual(['n2', 'n3'])
    })
  })

  describe('editOption and the column edit flag (FILL-03)', () => {
    // date 不可编辑，其余列可编辑
    const EDIT_COLUMNS = COLUMNS.map(x => (x.field === 'date' ? { ...x } : { ...x, edit: true }))

    function editCallbacks(overrides: Record<string, any> = {}) {
      return {
        beforeCellValueChange: vi.fn(),
        cellValueChange: vi.fn(),
        afterCellValueChange: vi.fn(),
        ...overrides,
      }
    }

    function mountEditable(
      editOption: Record<string, any> | null = editCallbacks(),
      cellAutofillOption: Record<string, any> = {},
    ) {
      mockTableLayout()
      return mountTable({
        columns: cloneDeep(EDIT_COLUMNS),
        cellAutofillOption,
        ...(editOption ? { editOption } : {}),
      })
    }

    // "回调名:行 key:列 key:changeValue"
    function describeCall(name: string, params: any) {
      return `${name}:${params.row.rowKey}:${params.column.key}:${params.changeValue}`
    }

    it('fills down only the columns with edit: true', async () => {
      mountEditable()

      await selectRange('r1', 'name', 'r1', 'hobby')
      await dragCorner(['r2', 'hobby'], ['r3', 'hobby'])
      await releaseInTable('r3', 'hobby')

      expect(vueErrors).toEqual([])
      expect(rowOf('r2')).toMatchObject({ name: 'n1', date: 'd2', hobby: 'h1' })
      expect(rowOf('r3')).toMatchObject({ name: 'n1', date: 'd3', hobby: 'h1' })
    })

    it('fills right only the columns with edit: true', async () => {
      mountEditable()

      await fill(['r1', 'name'], ['r1', 'date'], ['r1', 'hobby'])

      expect(vueErrors).toEqual([])
      expect(rowOf('r1')).toMatchObject({ name: 'n1', date: 'd1', hobby: 'n1' })
    })

    it('fires the cell value callbacks once per changed cell, with the editing payload', async () => {
      const editOption = editCallbacks()
      mountEditable(editOption)
      // r2 的 name 已与源单元格相同：不触发回调
      rowOf('r2').name = 'n1'

      await fill(['r1', 'name'], ['r2', 'name'], ['r3', 'name'])

      expect(rowOf('r3').name).toBe('n1')
      expect(editOption.beforeCellValueChange).toHaveBeenCalledTimes(1)
      const beforeParams = editOption.beforeCellValueChange.mock.calls[0][0]
      expect(beforeParams.column).toMatchObject({ key: 'name', field: 'name' })
      expect(beforeParams.changeValue).toBe('n1')
      // before 回调拿到的是修改前的行副本
      expect(beforeParams.row).toEqual(TABLE_DATA[2])
      expect(beforeParams.row).not.toBe(rowOf('r3'))

      for (const callback of [editOption.cellValueChange, editOption.afterCellValueChange]) {
        expect(callback).toHaveBeenCalledTimes(1)
        const params = callback.mock.calls[0][0]
        // 与单元格编辑相同，after 回调拿到的是表格中的行对象本身
        expect(toRaw(params.row)).toBe(toRaw(rowOf('r3')))
        expect(params.column).toMatchObject({ key: 'name' })
        expect(params.changeValue).toBe('n1')
      }
    })

    it('beforeCellValueChange returning false or throwing skips that cell only', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const editOption = editCallbacks({
        beforeCellValueChange: vi.fn(({ row }: any) => {
          if (row.rowKey === 'r2')
            throw new Error('boom')
          if (row.rowKey === 'r3')
            return false
        }),
      })
      const afterAutofill = vi.fn()
      mountEditable(editOption, { afterAutofill })

      await fill(['r1', 'name'], ['r2', 'name'], ['r3', 'name'], ['r4', 'name'])

      expect(vueErrors).toEqual([])
      expect([rowOf('r2').name, rowOf('r3').name, rowOf('r4').name]).toEqual(['n2', 'n3', 'n1'])
      expect(editOption.beforeCellValueChange).toHaveBeenCalledTimes(3)
      expect(error).toHaveBeenCalled()
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(1)
      expect(editOption.afterCellValueChange.mock.calls[0][0].row.rowKey).toBe('r4')
      // 整个填充仍然完成：选区更新、afterAutofill 照常调用
      expect(afterAutofill).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.cellSelectionData.normalEndCell).toEqual({ rowKey: 'r4', colKey: 'name', rowIndex: 3 })
    })

    it('a throwing afterCellValueChange keeps the change and the remaining callbacks run', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const editOption = editCallbacks({
        afterCellValueChange: vi.fn(() => {
          throw new Error('boom')
        }),
      })
      const afterAutofill = vi.fn()
      mountEditable(editOption, { afterAutofill })

      await fill(['r1', 'name'], ['r2', 'name'], ['r3', 'name'])

      expect(vueErrors).toEqual([])
      expect([rowOf('r2').name, rowOf('r3').name]).toEqual(['n1', 'n1'])
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(2)
      expect(error).toHaveBeenCalledTimes(2)
      expect(afterAutofill).toHaveBeenCalledTimes(1)
    })

    it('order: beforeAutofill, per-cell before, selection, per-cell after, afterAutofill', async () => {
      const calls: string[] = []
      const editOption = editCallbacks()
      for (const name of ['beforeCellValueChange', 'cellValueChange', 'afterCellValueChange'] as const) {
        editOption[name].mockImplementation((params: any) => {
          calls.push(describeCall(name, params))
          if (name === 'afterCellValueChange')
            calls.push(`selection:${wrapper.vm.cellSelectionData.normalEndCell.rowKey}`)
        })
      }
      mountEditable(editOption, {
        beforeAutofill: () => {
          calls.push('beforeAutofill')
        },
        afterAutofill: () => {
          calls.push('afterAutofill')
        },
      })

      await selectRange('r1', 'name', 'r1', 'date')
      await dragCorner(['r2', 'date'], ['r3', 'date'])
      await releaseInTable('r3', 'date')

      expect(calls).toEqual([
        'beforeAutofill',
        'beforeCellValueChange:r2:name:n1',
        'beforeCellValueChange:r3:name:n1',
        'cellValueChange:r2:name:n1',
        'afterCellValueChange:r2:name:n1',
        'selection:r3',
        'cellValueChange:r3:name:n1',
        'afterCellValueChange:r3:name:n1',
        'selection:r3',
        'afterAutofill',
      ])
    })

    it('beforeAutofill returning false fires no cell value callback', async () => {
      const editOption = editCallbacks()
      mountEditable(editOption, { beforeAutofill: () => false })

      await fill(['r1', 'name'], ['r2', 'name'])

      expect(rowOf('r2').name).toBe('n2')
      expect(editOption.beforeCellValueChange).not.toHaveBeenCalled()
      expect(editOption.afterCellValueChange).not.toHaveBeenCalled()
    })

    it('without editOption, every data column is filled', async () => {
      mockTableLayout()
      mountTable({ columns: cloneDeep(EDIT_COLUMNS), cellAutofillOption: {} })

      await selectRange('r1', 'name', 'r1', 'hobby')
      await dragCorner(['r2', 'hobby'])
      await releaseInTable('r2', 'hobby')

      expect(rowOf('r2')).toMatchObject({ name: 'n1', date: 'd1', hobby: 'h1' })
    })
  })

  describe('columns that hold no data (FILL-04)', () => {
    // 操作列（有 field）与没有 field 的列
    const NON_DATA_COLUMNS: Record<string, any>[] = [
      { field: 'index', key: 'op', title: '#', operationColumn: true, width: COL_WIDTH },
      { field: 'name', key: 'name', title: 'Name', width: COL_WIDTH },
      { key: 'x', title: 'Actions', width: COL_WIDTH },
      { field: 'date', key: 'date', title: 'Date', width: COL_WIDTH },
      { field: 'hobby', key: 'hobby', title: 'Hobby', width: COL_WIDTH },
    ]

    function mountWithNonDataColumns(cellAutofillOption: Record<string, any> = {}) {
      mockTableLayout(NON_DATA_COLUMNS.map(x => x.key))
      return mountTable({ columns: cloneDeep(NON_DATA_COLUMNS), cellAutofillOption })
    }

    function expectNoForeignKeys(row: Record<string, any>) {
      expect(row).not.toHaveProperty('undefined')
      expect(row).not.toHaveProperty('index')
    }

    it('a vertical fill skips them and fills the data columns', async () => {
      mountWithNonDataColumns()

      await selectRange('r1', 'op', 'r1', 'date')
      await dragCorner(['r2', 'date'], ['r3', 'date'])
      await releaseInTable('r3', 'date')

      expect(vueErrors).toEqual([])
      for (const rowKey of ['r2', 'r3']) {
        expect(rowOf(rowKey)).toMatchObject({ name: 'n1', date: 'd1' })
        expectNoForeignKeys(rowOf(rowKey))
      }
    })

    it('a horizontal fill skips them as targets and as sources', async () => {
      mountWithNonDataColumns()

      // 源：name、x（无数据）；目标：date ← name，hobby ← x（没有可填充的值，保持不变）
      await selectRange('r1', 'name', 'r2', 'x')
      await dragCorner(['r2', 'date'], ['r2', 'hobby'])
      await releaseInTable('r2', 'hobby')

      expect(vueErrors).toEqual([])
      expect(rowOf('r1')).toMatchObject({ date: 'n1', hobby: 'h1' })
      expect(rowOf('r2')).toMatchObject({ date: 'n2', hobby: 'h2' })
      expectNoForeignKeys(rowOf('r1'))
      expectNoForeignKeys(rowOf('r2'))
    })

    it('a fill over a column without field does not write an "undefined" key', async () => {
      mountWithNonDataColumns()

      await fill(['r1', 'name'], ['r1', 'x'])

      expect(vueErrors).toEqual([])
      expectNoForeignKeys(rowOf('r1'))
    })

    it('the autofill payload has no "undefined" key', async () => {
      const afterAutofill = vi.fn()
      mountWithNonDataColumns({ afterAutofill })

      await selectRange('r1', 'name', 'r1', 'x')
      await dragCorner(['r2', 'x'])
      await releaseInTable('r2', 'x')

      expect(afterAutofill).toHaveBeenCalledTimes(1)
      const { sourceSelectionData, targetSelectionData } = afterAutofill.mock.calls[0][0]
      // toStrictEqual：值为 undefined 的 "undefined" 键也算不相等
      expect(sourceSelectionData).toStrictEqual([{ rowKey: 'r1', name: 'n1' }])
      expect(targetSelectionData).toStrictEqual([{ rowKey: 'r2', name: 'n1' }])
    })
  })

  /*
  FILL-05：没有任何可写入的单元格时（目标列都不能写入，或横向填充的源列都没有数据）不执行填充：
  不调用 beforeAutofill / afterAutofill，选区保持不变（与粘贴的 CLIP-11 相同）
  */
  describe('an autofill with nothing to write (FILL-05)', () => {
    // x 没有 field；设置了 editOption 时只有 name、hobby 可写入
    const COLUMNS_WITHOUT_DATA: Record<string, any>[] = [
      { field: 'name', key: 'name', title: 'Name', width: COL_WIDTH, edit: true },
      { key: 'x', title: 'Actions', width: COL_WIDTH },
      { field: 'date', key: 'date', title: 'Date', width: COL_WIDTH },
      { field: 'hobby', key: 'hobby', title: 'Hobby', width: COL_WIDTH, edit: true },
    ]

    function mountColumns(props: Record<string, any> = {}) {
      mockTableLayout(COLUMNS_WITHOUT_DATA.map(x => x.key))
      const callbacks = { beforeAutofill: vi.fn(), afterAutofill: vi.fn() }
      mountTable({
        columns: cloneDeep(COLUMNS_WITHOUT_DATA),
        cellAutofillOption: callbacks,
        ...props,
      })
      return callbacks
    }

    function expectSelection(currentCell: Record<string, any>, normalEndCell: Record<string, any>) {
      expect(wrapper.vm.cellSelectionData.currentCell).toMatchObject(currentCell)
      expect(wrapper.vm.cellSelectionData.normalEndCell).toMatchObject(normalEndCell)
      expect(wrapper.vm.cellSelectionData.autoFillEndCell).toMatchObject({ rowKey: '', colKey: '' })
    }

    it('a fill into a column without field runs no autofill flow', async () => {
      const { beforeAutofill, afterAutofill } = mountColumns()

      await fill(['r1', 'name'], ['r1', 'x'])

      expect(vueErrors).toEqual([])
      expect(beforeAutofill).not.toHaveBeenCalled()
      expect(afterAutofill).not.toHaveBeenCalled()
      expectSelection({ rowKey: 'r1', colKey: 'name' }, { rowKey: '', colKey: '' })
      expect(rowOf('r1')).toEqual(TABLE_DATA[0])
    })

    it('a horizontal fill whose source columns hold no data runs no autofill flow', async () => {
      const { beforeAutofill, afterAutofill } = mountColumns()

      // 源：x（没有数据）；目标：date
      await fill(['r2', 'x'], ['r2', 'date'])

      expect(beforeAutofill).not.toHaveBeenCalled()
      expect(afterAutofill).not.toHaveBeenCalled()
      expectSelection({ rowKey: 'r2', colKey: 'x' }, { rowKey: '', colKey: '' })
      expect(rowOf('r2')).toEqual(TABLE_DATA[1])
    })

    it('with editOption, a fill that only covers non-editable columns runs no autofill flow', async () => {
      const editOption = { beforeCellValueChange: vi.fn(), afterCellValueChange: vi.fn() }
      const { beforeAutofill, afterAutofill } = mountColumns({ editOption })

      // date 不可编辑：向下填充只覆盖 date
      await selectRange('r1', 'date', 'r2', 'date')
      await dragCorner(['r3', 'date'], ['r4', 'date'])
      await releaseInTable('r4', 'date')

      expect(beforeAutofill).not.toHaveBeenCalled()
      expect(afterAutofill).not.toHaveBeenCalled()
      expect(editOption.beforeCellValueChange).not.toHaveBeenCalled()
      // 区域选择保持不变，没有扩展到 r4
      expectSelection({ rowKey: 'r1', colKey: 'date' }, { rowKey: 'r2', colKey: 'date' })
      expect([rowOf('r3').date, rowOf('r4').date]).toEqual(['d3', 'd4'])
    })

    it('a fill that covers one writable column still runs', async () => {
      const editOption = { beforeCellValueChange: vi.fn(), afterCellValueChange: vi.fn() }
      const { beforeAutofill, afterAutofill } = mountColumns({ editOption })

      // 目标 date（不可编辑）、hobby（可编辑）
      await fill(['r1', 'name'], ['r1', 'x'], ['r1', 'date'], ['r1', 'hobby'])

      expect(beforeAutofill).toHaveBeenCalledTimes(1)
      expect(afterAutofill).toHaveBeenCalledTimes(1)
      expect(rowOf('r1')).toMatchObject({ date: 'd1', hobby: 'n1' })
      expectSelection({ rowKey: 'r1', colKey: 'name' }, { rowKey: 'r1', colKey: 'hobby' })
    })

    it('a fill whose values are already in place still runs', async () => {
      const { beforeAutofill, afterAutofill } = mountColumns()
      rowOf('r2').name = 'n1'

      await fill(['r1', 'name'], ['r2', 'name'])

      expect(beforeAutofill).toHaveBeenCalledTimes(1)
      expect(afterAutofill).toHaveBeenCalledTimes(1)
      expectSelection({ rowKey: 'r1', colKey: 'name' }, { rowKey: 'r2', colKey: 'name' })
    })
  })

  /*
  FILL-06：填充与粘贴、剪切、删除一样触发 CLIPBOARD_CELL_VALUE_CHANGE，
  单元格内容变化导致行高变化时，选区边框会重新定位
  */
  describe('autofill refreshes the selection (FILL-06)', () => {
    // 记录 CLIPBOARD_CELL_VALUE_CHANGE（连同当时的选区结束单元格）与回调的调用顺序
    function recordHook(calls: string[]) {
      const original = wrapper.vm.tableContext.emit.bind(wrapper.vm.tableContext)
      return vi.spyOn(wrapper.vm.tableContext, 'emit').mockImplementation((name: any, ...args: any[]) => {
        if (name === HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
          calls.push(`hook:${wrapper.vm.cellSelectionData.normalEndCell.rowKey}`)
        return original(name, ...args)
      })
    }

    it('triggers the cell value change hook after the selection update and before the after callbacks', async () => {
      const calls: string[] = []
      mockTableLayout()
      mountTable({
        columns: cloneDeep(COLUMNS).map(x => ({ ...x, edit: true })),
        editOption: {
          afterCellValueChange: ({ row }: any) => calls.push(`afterCellValueChange:${row.rowKey}`),
        },
        cellAutofillOption: {
          beforeAutofill: () => {
            calls.push('beforeAutofill')
          },
          afterAutofill: () => {
            calls.push('afterAutofill')
          },
        },
      })

      await select('r1', 'name')
      recordHook(calls)
      await dragCorner(['r2', 'name'], ['r3', 'name'])
      await releaseInTable('r3', 'name')

      expect(calls).toEqual([
        'beforeAutofill',
        'hook:r3',
        'afterCellValueChange:r2',
        'afterCellValueChange:r3',
        'afterAutofill',
      ])
    })

    it('triggers the hook once without editOption', async () => {
      const calls: string[] = []
      mockTableLayout()
      mountTable({ cellAutofillOption: { afterAutofill: () => calls.push('afterAutofill') } })

      await select('r1', 'name')
      recordHook(calls)
      await dragCorner(['r2', 'name'])
      await releaseInTable('r2', 'name')

      expect(calls).toEqual(['hook:r2', 'afterAutofill'])
    })

    it('a cancelled autofill or one with nothing to write does not trigger the hook', async () => {
      const calls: string[] = []
      mockTableLayout()
      mountTable({ cellAutofillOption: { beforeAutofill: () => false } })

      await select('r1', 'name')
      recordHook(calls)
      await dragCorner(['r2', 'name'])
      await releaseInTable('r2', 'name')
      expect(rowOf('r2').name).toBe('n2')

      // editOption 下没有 edit: true 的列：没有可写入的单元格（FILL-05）
      await wrapper.setProps({ editOption: {}, cellAutofillOption: {} })
      await select('r1', 'name')
      await dragCorner(['r2', 'name'])
      await releaseInTable('r2', 'name')
      expect(rowOf('r2').name).toBe('n2')

      expect(calls).toEqual([])
    })
  })

  describe('selection border geometry (SEL-07)', () => {
    function makeBorders() {
      const line = (width: number, height: number) => ({ show: true, width, height, top: 10, left: 20 })
      return {
        borderWidth: 201,
        borderHeight: 80,
        topBorder: line(0, 1),
        rightBorder: line(1, 0),
        bottomBorder: { ...line(0, 1), top: 89 },
        leftBorder: line(1, 0),
        corner: { show: true, top: 85, left: 216 },
      }
    }

    it('adjustSelectionBorders does not mutate its input', () => {
      const borders = makeBorders()
      const snapshot = cloneDeep(borders)

      const result = adjustSelectionBorders(borders, {
        fixedType: 'right',
        fixedColsTotalWidth: 100,
        isAllColsFixed: false,
        isFirstSelectionRow: true,
        isFirstSelectionCol: true,
        isFirstNotFixedSelectionCol: false,
        showCorner: false,
      })

      expect(borders).toEqual(snapshot)
      expect(result.topBorder).not.toBe(borders.topBorder)
      expect(result.borderWidth).toBe(100)
      expect(result.topBorder.top).toBe(11)
      expect(result.leftBorder.show).toBe(false)
      expect(result.corner.show).toBe(false)
    })

    it('the area layer is the box enclosed by the borders', () => {
      const borders = adjustSelectionBorders(makeBorders(), {
        fixedType: '',
        fixedColsTotalWidth: 0,
        isAllColsFixed: false,
        isFirstSelectionRow: false,
        isFirstSelectionCol: false,
        isFirstNotFixedSelectionCol: false,
        showCorner: true,
      })
      expect(getAreaLayerRect(borders)).toEqual({ top: 10, left: 20, width: 201, height: 80 })
    })

    // 读取渲染出的边框与浮层的位置
    function boxOf(el: Element) {
      const style = (el as HTMLElement).style
      return {
        top: Number.parseFloat(style.top),
        left: Number.parseFloat(style.left),
        width: Number.parseFloat(style.width),
        height: Number.parseFloat(style.height),
      }
    }

    function expectLayerMatchesBorders(sideClass: string) {
      const side = wrapper.find(`.${sideClass}`)
      const area = side.find('.ve-table-selection-normal-area')
      const layer = side.find('.ve-table-selection-normal-area-layer')
      expect(area.exists()).toBe(true)
      expect(layer.exists()).toBe(true)

      const [top, , bottom] = area.findAll('.ve-table-selection-border').map((x: any) => boxOf(x.element))
      expect(boxOf(layer.element)).toEqual({
        top: top.top,
        left: top.left,
        width: top.width,
        height: bottom.top + bottom.height - top.top,
      })
    }

    it('the area layer matches the area borders on the first row', async () => {
      mockTableLayout()
      mountTable()
      await selectRange('r1', 'name', 'r2', 'date')
      expectLayerMatchesBorders('ve-table-selection-middle')
    })

    it('the area layer matches the area borders below the first row', async () => {
      mockTableLayout()
      mountTable()
      await selectRange('r2', 'date', 'r3', 'hobby')
      expectLayerMatchesBorders('ve-table-selection-middle')
    })

    it('the area layer on the right fixed side matches that side\'s borders', async () => {
      mockTableLayout()
      const columns = cloneDeep(COLUMNS)
      columns[3].fixed = 'right'
      mountTable({ columns })
      await selectRange('r2', 'date', 'r3', 'address')

      expectLayerMatchesBorders('ve-table-selection-fixed-right')
      expectLayerMatchesBorders('ve-table-selection-middle')
      // 右固定列一侧只覆盖固定列的宽度
      const layer = wrapper.find('.ve-table-selection-fixed-right .ve-table-selection-normal-area-layer')
      expect(boxOf(layer.element).width).toBe(COL_WIDTH)
    })

    it('rendering the selection twice gives the same borders', async () => {
      mockTableLayout()
      mountTable()
      await selectRange('r1', 'name', 'r2', 'date')
      const html = wrapper.find('.ve-table-selection-wrapper').html()

      wrapper.findComponent({ name: 'VeTableSelection' }).vm.$forceUpdate()
      await later()

      expect(wrapper.find('.ve-table-selection-wrapper').html()).toBe(html)
    })
  })
})
