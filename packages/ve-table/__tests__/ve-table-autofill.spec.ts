/*
单元格自动填充（autofill）：
- 填充方向由选区与结束单元格的位置计算，不再是渲染副作用（FILL-01）
- 在表格外 / 窗口外释放鼠标、窗口失焦时取消填充（FILL-02）
- 选区边框几何计算不修改共享对象，区域浮层与边框围成的矩形一致（SEL-07）
*/

import veTable from '@/ve-table'
import {
  adjustSelectionBorders,
  getAreaLayerRect,
  getAutofillDirection,
} from '@/ve-table/src/selection/geometry'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'

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
function mockTableLayout() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.tagName === 'TD' && this.hasAttribute('col-key')) {
      const colIndex = COL_KEYS.indexOf(this.getAttribute('col-key')!)
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

      // 拖动结束后移除
      await fill(['r1', 'name'], ['r2', 'name'])
      expect(added().length).toBe(2)
      expect(added().every(isRemoved)).toBe(true)

      // 拖动中卸载也要移除
      await select('r1', 'date')
      await dragCorner(['r2', 'date'])
      expect(added().length).toBe(4)
      wrapper.unmount()
      wrapper = null
      expect(added().every(isRemoved)).toBe(true)
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
