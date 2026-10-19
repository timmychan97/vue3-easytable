import type { PropType, VNode } from 'vue'
import type { PageSizeOption } from './parts'
import { useI18N } from '@vue3-easytable/common/locale'
import Pager from './pager'
import { Jumper, Next, Prev, Sizer, Total } from './parts'
import { clampPageIndex, clsName, toValidPageIndex } from './util'
import { COMPS_NAME, EMIT_EVENTS, LOCALE_COMP_NAME } from './util/constant'

type LayoutItem = 'total' | 'prev' | 'pager' | 'next' | 'sizer' | 'jumper'

export default defineComponent({
  name: COMPS_NAME.VE_PAGINATION,
  props: {
    layout: {
      type: Array as PropType<LayoutItem[]>,
      default() {
        return ['total', 'prev', 'pager', 'next', 'sizer', 'jumper']
      },
    },

    // 总条数
    total: {
      type: Number,
      required: true,
    },

    // 当前页
    pageIndex: {
      type: Number,
      default: 1,
    },

    // 最多显示几个数字按钮
    pagingCount: {
      type: Number,
      default: 5,
    },

    // 每页大小
    pageSize: {
      type: Number,
      default: 10,
    },

    // 每页大小下拉配置
    pageSizeOption: {
      type: Array as PropType<number[]>,
      default() {
        return [10, 20, 30]
      },
    },
    // popper append to element
    // 不传时在挂载后使用 document.body（不能在默认值里访问 document，否则 SSR 导入会崩溃）
    popperAppendTo: {
      type: [String, Object] as PropType<string | HTMLElement>,
      default: undefined,
    },
  },
  emits: [EMIT_EVENTS.PAGE_NUMBER_CHANGE, EMIT_EVENTS.PAGE_SIZE_CHANGE],
  /**
   * 状态和方法都在 setup 中（D1）。子组件只通过 props 和事件与这里通信（MOD-10）。
   * 返回值保持原来 Options API 实例上的成员（newPageIndex、pageCount、prevPage、goBackPageIndex …），
   * 通过 ref 访问实例的代码不受影响。
   */
  setup(props, { emit }) {
    // 解析语言包（最近的 ConfigProvider，否则为 app / 全局语言包）
    const t = useI18N(LOCALE_COMP_NAME)

    const newPageIndex = ref(toValidPageIndex(props.pageIndex))
    const newPageSize = ref(props.pageSize)

    // 总页数至少为 1（total = 0 或 pageSize 非法时也不会出现 0 / Infinity / NaN）
    const pageCount = computed(() => {
      const total = Number(props.total) > 0 ? Number(props.total) : 0
      const size = Number(newPageSize.value) >= 1 ? Number(newPageSize.value) : 1
      return Math.max(1, Math.ceil(total / size))
    })

    const newPageSizeOption = computed<PageSizeOption[]>(() => {
      return props.pageSizeOption.map(x => ({
        value: x,
        label: x + t('每页条数'),
        selected: newPageSize.value === x,
      }))
    })

    // 只规范化（正整数，否则为 1），不按总页数截断：total 可能稍后才加载
    watch(() => props.pageIndex, (newVal) => {
      newPageIndex.value = toValidPageIndex(newVal)
    })

    watch(() => props.pageSize, (newVal) => {
      newPageSize.value = newVal
    })

    // 用户输入的页码：正整数，并且不超过总页数
    function getValidNum(value: unknown) {
      return clampPageIndex(value, pageCount.value)
    }

    function jumpPageHandler(pageIndex: number) {
      newPageIndex.value = pageIndex
      emit(EMIT_EVENTS.PAGE_NUMBER_CHANGE, newPageIndex.value)
    }

    // 上一页（当前页超过总页数时回到最后一页）
    function prevPage() {
      if (newPageIndex.value > 1) {
        newPageIndex.value = Math.min(newPageIndex.value - 1, pageCount.value)
        emit(EMIT_EVENTS.PAGE_NUMBER_CHANGE, newPageIndex.value)
      }
    }

    // 下一页
    function nextPage() {
      if (newPageIndex.value < pageCount.value) {
        newPageIndex.value = newPageIndex.value + 1
        emit(EMIT_EVENTS.PAGE_NUMBER_CHANGE, newPageIndex.value)
      }
    }

    // 改变页面大小（使用传入的值；下拉框不再修改缓存的选项对象，不能再从 newPageSizeOption 中查找）
    function pageSizeChangeHandler(pageSize: number) {
      if (typeof pageSize !== 'number' || !(pageSize > 0))
        return

      newPageSize.value = pageSize
      newPageIndex.value = 1
      emit(EMIT_EVENTS.PAGE_SIZE_CHANGE, newPageSize.value)
    }

    // 回到初始页码
    function goBackPageIndex() {
      newPageIndex.value = toValidPageIndex(props.pageIndex)
    }

    // 还原每页大小
    function goBackPageSize() {
      if (props.pageSize > 0)
        newPageSize.value = props.pageSize
    }

    return {
      t,
      newPageIndex,
      newPageSize,
      pageCount,
      newPageSizeOption,
      getValidNum,
      jumpPageHandler,
      prevPage,
      nextPage,
      pageSizeChangeHandler,
      goBackPageIndex,
      goBackPageSize,
    }
  },
  render() {
    const comps: Record<LayoutItem, VNode> = {
      total: <Total total={this.total} />,
      prev: (
        <Prev
          pageIndex={this.newPageIndex}
          pageCount={this.pageCount}
          onPrev={this.prevPage}
        />
      ),
      pager: (
        <Pager
          pageCount={this.pageCount}
          pageIndex={this.newPageIndex}
          pagingCount={this.pagingCount}
          onJump={this.jumpPageHandler}
        />
      ),
      next: (
        <Next
          pageIndex={this.newPageIndex}
          pageCount={this.pageCount}
          onNext={this.nextPage}
        />
      ),
      sizer: (
        <Sizer
          options={this.newPageSizeOption}
          popperAppendTo={this.popperAppendTo}
          onChange={this.pageSizeChangeHandler}
        />
      ),
      jumper: (
        <Jumper
          pageIndex={this.newPageIndex}
          pageCount={this.pageCount}
          onJump={this.jumpPageHandler}
        />
      ),
    }

    return (
      <nav class={clsName('nav')} aria-label={this.t('分页导航')}>
        <ul class="ve-pagination" role="list">
          {this.layout.map(item => comps[item])}
        </ul>
      </nav>
    )
  },
})
