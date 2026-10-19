import { useI18N } from '@vue3-easytable/common/locale'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeIcon from '@vue3-easytable/ve-icon'
import VeSelect from '@vue3-easytable/ve-select'
import Pager from './pager'
import { clsName } from './util'
import { COMPS_NAME, EMIT_EVENTS, LOCALE_COMP_NAME } from './util/constant'

// 规范化页码：正整数，否则为 1
function toValidPageIndex(value: unknown): number {
  const num = Number.parseInt(`${value}`, 10)
  return Number.isNaN(num) || num < 1 ? 1 : num
}

// 子组件读取的父组件状态
interface PagerState {
  newPageIndex: number
  pageCount: number
}

// 每个组件在 setup 中解析语言包（最近的 ConfigProvider，否则为全局语言包）
function setupLocale() {
  return { t: useI18N(LOCALE_COMP_NAME) }
}

export default defineComponent({
  name: COMPS_NAME.VE_PAGINATION,
  components: {
    Total: {
      setup: setupLocale,
      render() {
        return (
          <span class={clsName('total')} aria-live="polite">
            {this.t('合计', this.$parent.total)}
          </span>
        )
      },
    },

    Prev: {
      setup: setupLocale,
      render() {
        // 只有一页（包括 total = 0）时也禁用
        const { newPageIndex, pageCount } = this.$parent as unknown as PagerState
        const isDisabled = newPageIndex <= 1 || pageCount <= 1
        return (
          <li
            onClick={this.$parent.prevPage}
            class={[
              isDisabled ? clsName('disabled') : '',
              clsName('li'),
              clsName('prev'),
            ]}
          >
            <button
              type="button"
              aria-label={this.t('上一页')}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              tabindex={isDisabled ? -1 : 0}
            >
              <VeIcon name={ICON_NAMES.LEFT_ARROW} />
            </button>
          </li>
        )
      },
    },

    Pager,

    Next: {
      setup: setupLocale,
      render() {
        // 用 >=：total 变小后当前页可能超过总页数
        const { newPageIndex, pageCount } = this.$parent as unknown as PagerState
        const isDisabled = newPageIndex >= pageCount
        return (
          <li
            onClick={this.$parent.nextPage}
            class={[
              isDisabled ? clsName('disabled') : '',
              clsName('li'),
              clsName('next'),
            ]}
          >
            <button
              type="button"
              aria-label={this.t('下一页')}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              tabindex={isDisabled ? -1 : 0}
            >
              <VeIcon name={ICON_NAMES.RIGHT_ARROW} />
            </button>
          </li>
        )
      },
    },

    Sizer: {
      // 每个实例使用独立的元素 id，避免多个分页组件的 aria-labelledby 互相指向（useId 在 SSR 下也稳定）
      setup: () => ({ ...setupLocale(), labelId: `ve-pagination-size-label-${useId()}` }),
      render() {
        return (
          <div class={clsName('select-wrapper')}>
            <span class={clsName('select-label')} id={this.labelId}>
              {this.t('每页显示条数')}
            </span>
            <VeSelect
              class={clsName('select')}
              modelValue={this.$parent.newPageSizeOption}
              popperAppendTo={this.$parent.popperAppendTo}
              aria-labelledby={this.labelId}
              // eslint-disable-next-line ts/ban-ts-comment
              // @ts-expect-error
              onUpdate:modelValue={this.handleChange}
            />
          </div>
        )
      },

      methods: {
        handleChange(items: { value: number, label: string, selected: boolean }[]) {
          if (Array.isArray(items) && items.length > 0) {
            const item = items.find(x => x.selected)
            if (item)
              this.$parent.pageSizeChangeHandler(item.value)
          }
        },
      },
    },

    Jumper: {
      // 每个实例使用独立的 id，label 的 for 只指向本实例的输入框
      setup: () => ({ ...setupLocale(), inputId: `ve-pagination-jumper-${useId()}` }),
      methods: {
        jumperEnter(event: KeyboardEvent) {
          if (event.key !== 'Enter')
            return
          const target = event.target as HTMLInputElement
          const val = this.$parent.getValidNum(target.value)
          target.value = val
          this.$parent.jumpPageHandler(val)
        },
      },
      render() {
        return (
          <span class={clsName('goto')}>
            <label class={clsName('goto-label')} for={this.inputId}>
              {this.t('前往')}
            </label>
            <input
              id={this.inputId}
              class={clsName('goto-input')}
              value={this.$parent.newPageIndex}
              onKeyup={this.jumperEnter}
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              aria-label={this.t('跳转到')}
            />
            <span class={clsName('goto-suffix')} aria-hidden="true">
              {this.t('页')}
            </span>
          </span>
        )
      },
    },
  },
  props: {
    layout: {
      type: Array as PropType<('total' | 'prev' | 'pager' | 'next' | 'sizer' | 'jumper')[]>,
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
  setup: setupLocale,
  data() {
    return {
      newPageIndex: toValidPageIndex(this.pageIndex),

      newPageSize: this.pageSize,
    }
  },

  computed: {
    // 总页数至少为 1（total = 0 或 pageSize 非法时也不会出现 0 / Infinity / NaN）
    pageCount() {
      const total = Number(this.total) > 0 ? Number(this.total) : 0
      const size = Number(this.newPageSize) >= 1 ? Number(this.newPageSize) : 1
      return Math.max(1, Math.ceil(total / size))
    },
    newPageSizeOption() {
      return this.pageSizeOption.map((x) => {
        const temp = {
          value: 0,
          label: '',
          selected: false,
        }

        temp.value = x
        temp.label = x + this.t('每页条数')
        if (this.newPageSize === x)
          temp.selected = true

        return temp
      })
    },
  },
  watch: {
    // 只规范化（正整数，否则为 1），不按总页数截断：total 可能稍后才加载
    pageIndex(newVal) {
      this.newPageIndex = toValidPageIndex(newVal)
    },

    pageSize(newVal) {
      this.newPageSize = newVal
    },
  },

  methods: {
    getValidNum(value: number) {
      let result = 1

      value = Number.parseInt(`${value}`, 10)

      if (Number.isNaN(value) || value < 1) {
        result = 1
      }
      else {
        if (value < 1)
          result = 1

        else if (value > this.pageCount)
          result = this.pageCount

        else
          result = value
      }
      return result
    },

    jumpPageHandler(newPageIndex: number) {
      this.newPageIndex = newPageIndex
      this.$emit(EMIT_EVENTS.PAGE_NUMBER_CHANGE, this.newPageIndex)
    },

    // 上一页（当前页超过总页数时回到最后一页）
    prevPage() {
      if (this.newPageIndex > 1) {
        this.newPageIndex = Math.min(this.newPageIndex - 1, this.pageCount)
        this.$emit(EMIT_EVENTS.PAGE_NUMBER_CHANGE, this.newPageIndex)
      }
    },

    // 下一页
    nextPage() {
      if (this.newPageIndex < this.pageCount) {
        this.newPageIndex = this.newPageIndex + 1
        this.$emit(EMIT_EVENTS.PAGE_NUMBER_CHANGE, this.newPageIndex)
      }
    },

    // 改变页面大小（使用传入的值；下拉框不再修改缓存的选项对象，不能再从 newPageSizeOption 中查找）
    pageSizeChangeHandler(pageSize: number) {
      if (typeof pageSize !== 'number' || !(pageSize > 0))
        return

      this.newPageSize = pageSize
      this.newPageIndex = 1
      this.$emit(EMIT_EVENTS.PAGE_SIZE_CHANGE, this.newPageSize)
    },

    // 回到初始页码
    goBackPageIndex() {
      this.newPageIndex = toValidPageIndex(this.pageIndex)
    },

    // 还原每页大小
    goBackPageSize() {
      if (this.pageSize > 0)
        this.newPageSize = this.pageSize
    },
  },
  render() {
    const comps = {
      total: <total></total>,
      prev: <prev></prev>,
      pager: (
        <pager
          pageCount={this.pageCount}
          pageIndex={this.newPageIndex}
          pagingCount={this.pagingCount}
          onJumpPageHandler={this.jumpPageHandler}
        >
        </pager>
      ),
      next: <next></next>,
      sizer: <sizer></sizer>,
      jumper: <jumper onJumpPageHandler={this.jumpPageHandler}></jumper>,
    }

    return (
      <nav class={clsName('nav')} aria-label={this.t('分页导航')}>
        <ul class="ve-pagination" role="list">
          {
            this.layout.map((item) => {
              return comps[item]
            })
          }
        </ul>
      </nav>
    )
  },
})
