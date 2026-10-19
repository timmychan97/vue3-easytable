import { raf } from '@/common/utils/animation-frame'
import veTable from '@/ve-table'
import { later, mockVirtualScrollLayout, wrapMount as mount } from '@test-utils'
import { nextTick } from 'vue'

/*
 * 行插入指示器（INS-01、INS-02、VS-06）
 *
 * jsdom 没有布局：这里按一个固定的布局模型模拟 getBoundingClientRect（视口坐标）：
 * - 根元素 .vue-table-root 顶部在 ROOT_TOP，滚动容器 .ve-table-container 顶部在 CONTAINER_TOP
 * - 表头高 HEADER_HEIGHT，每行高 ROW_HEIGHT，第 i 行（数据下标）顶部 = 容器顶部 + 表头高 + i * 行高 - scrollTop
 * - <thead> 本身随内容滚动（吸顶的是 th 单元格，不是 thead），与浏览器一致
 * 指示线的 top 相对于根元素，即「边界的视口 y - ROOT_TOP」。
 */
describe('veTable row insert indicator', () => {
  const ROW_COUNT = 400
  const ROOT_TOP = 90
  const CONTAINER_TOP = 100
  const CONTAINER_HEIGHT = 500
  const CONTAINER_WIDTH = 1000
  const HEADER_HEIGHT = 40
  const ROW_HEIGHT = 40
  const FOOTER_ROW_HEIGHT = 40
  // 鼠标位于左侧检测区（索引列）内
  const MOUSE_X = 20

  const TABLE_DATA = Array.from({ length: ROW_COUNT }, (_, i) => ({
    rowKey: i,
    name: `name-${i}`,
    hobby: `hobby-${i}`,
  }))

  const COLUMNS = [
    { field: '', key: 'index', title: '#', width: 50, operationColumn: true },
    { field: 'name', key: 'name', title: 'Name', width: 200 },
    { field: 'hobby', key: 'hobby', title: 'Hobby', width: 300 },
  ]

  // 第 index 行（数据下标）顶部的视口 y
  function rowTop(index: number, scrollTop: number) {
    return CONTAINER_TOP + HEADER_HEIGHT + index * ROW_HEIGHT - scrollTop
  }

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

  // 统计读取 body 行 rect 的次数（INS-02）
  let rowRectReads = 0
  let rectSpy: { mockRestore: () => void }

  function getScrollTop(el: Element) {
    const container = el.closest('.ve-table-container') as HTMLElement | null
    return container ? container.scrollTop : 0
  }

  beforeEach(() => {
    rowRectReads = 0
    rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('vue-table-root'))
        return rect(0, ROOT_TOP, CONTAINER_WIDTH, CONTAINER_HEIGHT + CONTAINER_TOP - ROOT_TOP)
      if (this.classList.contains('ve-table-container'))
        return rect(0, CONTAINER_TOP, CONTAINER_WIDTH, CONTAINER_HEIGHT)
      if (this.tagName === 'THEAD')
        return rect(0, CONTAINER_TOP - getScrollTop(this), CONTAINER_WIDTH, HEADER_HEIGHT)
      // 表尾每行高 FOOTER_ROW_HEIGHT（没有 footerData 时高度为 0）
      if (this.tagName === 'TFOOT') {
        const height = (this as HTMLTableSectionElement).rows.length * FOOTER_ROW_HEIGHT
        return rect(0, rowTop(ROW_COUNT, getScrollTop(this)), CONTAINER_WIDTH, height)
      }
      if (this.tagName === 'TR' && this.classList.contains('ve-table-body-tr')) {
        rowRectReads++
        const index = Number(this.getAttribute('row-key'))
        return rect(0, rowTop(index, getScrollTop(this)), CONTAINER_WIDTH, ROW_HEIGHT)
      }
      return rect(0, 0, 0, 0)
    })
  })

  afterEach(() => {
    rectSpy.mockRestore()
  })

  async function settle() {
    await later()
    await later()
  }

  function nextFrame() {
    return new Promise<void>(resolve => raf(() => resolve()))
  }

  function mountTable(props: Record<string, unknown> = {}) {
    return mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        maxHeight: CONTAINER_HEIGHT,
        rowInsertOption: { enable: true },
        ...props,
      },
    })
  }

  function getContainer(wrapper: any) {
    return wrapper.find('.ve-table-container').element as HTMLElement
  }

  async function scrollTo(wrapper: any, scrollTop: number) {
    const containerEl = getContainer(wrapper)
    containerEl.scrollTop = scrollTop
    containerEl.dispatchEvent(new Event('scroll'))
    await settle()
  }

  function dispatchMove(wrapper: any, clientY: number) {
    getContainer(wrapper).dispatchEvent(
      new MouseEvent('mousemove', { clientX: MOUSE_X, clientY, bubbles: true }),
    )
  }

  // 移动鼠标并等待一帧（指示器在 rAF 中更新）
  async function hover(wrapper: any, clientY: number) {
    dispatchMove(wrapper, clientY)
    await nextFrame()
    await nextTick()
  }

  function getLine(wrapper: any) {
    const style = (wrapper.find('.ve-table-row-insert-indicator-line').element as HTMLElement).style
    return { visible: style.opacity === '1', top: Number.parseFloat(style.top) }
  }

  // 点击加号按钮，返回 on-row-insert 事件中的插入下标
  async function clickAdd(wrapper: any) {
    await wrapper.find('.ve-table-row-insert-indicator-button').trigger('click')
    const events = wrapper.emitted('on-row-insert') as Array<[{ insertRowIndex: number }]> | undefined
    return events?.[events.length - 1][0].insertRowIndex
  }

  describe('non-virtual', () => {
    it('inserts before the first row when hovering its top edge', async () => {
      const wrapper = mountTable()
      await settle()

      await hover(wrapper, rowTop(0, 0) + 2)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(0, 0) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(0)

      wrapper.unmount()
    })

    it('inserts at the hovered boundary between two rows', async () => {
      const wrapper = mountTable()
      await settle()

      await hover(wrapper, rowTop(3, 0) + 5)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(3, 0) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(3)

      wrapper.unmount()
    })

    it('hovering the header inserts before the first row', async () => {
      const wrapper = mountTable()
      await settle()

      await hover(wrapper, CONTAINER_TOP + 10)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(0, 0) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(0)

      wrapper.unmount()
    })
  })

  describe('sticky header scrolled to the middle, sticky footer (INS-01)', () => {
    it('hovering the sticky header inserts before the first visible row', async () => {
      const wrapper = mountTable()
      await settle()
      await scrollTo(wrapper, 300 * ROW_HEIGHT)

      // 第 300 行的顶部正好在表头下沿
      await hover(wrapper, CONTAINER_TOP + 10)

      expect(getLine(wrapper)).toEqual({ visible: true, top: CONTAINER_TOP + HEADER_HEIGHT - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(300)

      wrapper.unmount()
    })

    it('skips a boundary hidden under the sticky header', async () => {
      const wrapper = mountTable()
      await settle()
      const scrollTop = 300 * ROW_HEIGHT + 15
      await scrollTo(wrapper, scrollTop)

      // 第 300 行顶部（125）被表头（100–140）挡住，最近的可见边界是第 301 行顶部（165）
      await hover(wrapper, CONTAINER_TOP + HEADER_HEIGHT + 2)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(301, scrollTop) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(301)

      wrapper.unmount()
    })

    it('with a non-sticky header scrolled away, the top of the container is not header', async () => {
      const wrapper = mountTable({ fixedHeader: false })
      await settle()
      const scrollTop = 300 * ROW_HEIGHT
      await scrollTo(wrapper, scrollTop)

      // 表头已随内容滚走，容器顶部是第 299 行的顶部
      await hover(wrapper, CONTAINER_TOP + 5)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(299, scrollTop) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(299)

      wrapper.unmount()
    })

    it('skips a boundary hidden under the sticky footer', async () => {
      const wrapper = mountTable({
        footerData: [{ rowKey: 'footer', name: 'sum', hobby: '' }],
      })
      await settle()

      // 可视区底部 = 600 - 40（表尾）= 560；第 11 行顶部（580）被表尾挡住，最后一个可见边界是第 10 行顶部（540）
      await hover(wrapper, CONTAINER_TOP + CONTAINER_HEIGHT - 10)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(10, 0) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(10)

      wrapper.unmount()
    })
  })

  describe('virtual scroll (INS-01)', () => {
    let layout: ReturnType<typeof mockVirtualScrollLayout>
    beforeAll(() => {
      layout = mockVirtualScrollLayout({
        containerHeight: CONTAINER_HEIGHT,
        rowHeight: () => ROW_HEIGHT,
      })
    })
    afterAll(() => {
      layout.restore()
    })

    async function mountVirtual() {
      const wrapper = mountTable({ virtualScrollOption: { enable: true } })
      wrapper.triggerResizeObserver({ width: CONTAINER_HEIGHT })
      await settle()
      return wrapper
    }

    it('hovering a boundary in the middle inserts at its data index', async () => {
      const wrapper = await mountVirtual()
      const scrollTop = 300 * ROW_HEIGHT
      await scrollTo(wrapper, scrollTop)
      // 前提：已渲染的第一行在可视区之上（overscan），DOM 下标与数据下标不同
      expect(Number(wrapper.find('.ve-table-body-tr').attributes('row-key'))).toBeLessThan(300)

      await hover(wrapper, rowTop(305, scrollTop) + 3)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(305, scrollTop) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(305)

      wrapper.unmount()
    })

    it('hovering the sticky header inserts before the first visible row', async () => {
      const wrapper = await mountVirtual()
      await scrollTo(wrapper, 300 * ROW_HEIGHT)

      await hover(wrapper, CONTAINER_TOP + 10)

      expect(getLine(wrapper)).toEqual({ visible: true, top: CONTAINER_TOP + HEADER_HEIGHT - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(300)

      wrapper.unmount()
    })

    it('skips a boundary hidden under the sticky header', async () => {
      const wrapper = await mountVirtual()
      const scrollTop = 300 * ROW_HEIGHT + 15
      await scrollTo(wrapper, scrollTop)

      await hover(wrapper, CONTAINER_TOP + HEADER_HEIGHT + 2)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(301, scrollTop) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(301)

      wrapper.unmount()
    })

    it('inserts before the first data row at the top of the table', async () => {
      const wrapper = await mountVirtual()

      await hover(wrapper, rowTop(0, 0) + 2)

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(0, 0) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(0)

      wrapper.unmount()
    })
  })

  describe('mousemove cost (INS-02)', () => {
    it('reads O(log n) row rects per mousemove', async () => {
      const wrapper = mountTable()
      await settle()
      await scrollTo(wrapper, 250 * ROW_HEIGHT)

      rowRectReads = 0
      await hover(wrapper, rowTop(255, 250 * ROW_HEIGHT) + 3)

      expect(await clickAdd(wrapper)).toBe(255)
      // 400 行：二分查找约 log2(400) ≈ 9 次，再加上候选边界的少量读取
      expect(rowRectReads).toBeLessThanOrEqual(2 * Math.ceil(Math.log2(ROW_COUNT)) + 4)

      wrapper.unmount()
    })

    it('handles several mousemoves in one frame once, with the last position', async () => {
      const wrapper = mountTable()
      await settle()

      rowRectReads = 0
      dispatchMove(wrapper, rowTop(2, 0) + 3)
      dispatchMove(wrapper, rowTop(7, 0) + 3)
      // 同一帧内只记录位置，不读布局
      expect(rowRectReads).toBe(0)

      await nextFrame()
      await nextTick()
      const readsInFrame = rowRectReads

      expect(getLine(wrapper)).toEqual({ visible: true, top: rowTop(7, 0) - ROOT_TOP })
      expect(await clickAdd(wrapper)).toBe(7)
      expect(readsInFrame).toBeGreaterThan(0)
      expect(readsInFrame).toBeLessThanOrEqual(2 * Math.ceil(Math.log2(ROW_COUNT)) + 4)

      wrapper.unmount()
    })

    it('cancels the pending frame on unmount', async () => {
      const wrapper = mountTable()
      await settle()

      rowRectReads = 0
      dispatchMove(wrapper, rowTop(2, 0) + 3)
      wrapper.unmount()
      await nextFrame()
      await nextFrame()

      expect(rowRectReads).toBe(0)
    })
  })

  describe('props (VS-06)', () => {
    it('the indicator no longer takes virtualScrollPositions or visible indexes', async () => {
      const wrapper = mountTable({ virtualScrollOption: { enable: true } })
      await settle()

      const indicator = wrapper.findComponent({ name: 'VeTableRowInsertIndicator' })
      expect(indicator.exists()).toBe(true)
      const props = indicator.props() as Record<string, unknown>
      expect('virtualScrollPositions' in props).toBe(false)
      expect('virtualScrollVisibleIndexs' in props).toBe(false)

      wrapper.unmount()
    })
  })
})
