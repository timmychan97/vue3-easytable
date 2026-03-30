import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import { createLocale } from '@vue3-easytable/common/utils/index'
import VeIcon from '@vue3-easytable/ve-icon'
import VeSelect from '@vue3-easytable/ve-select'
import Pager from './pager'
import { clsName } from './util'
import { COMPS_NAME, EMIT_EVENTS, LOCALE_COMP_NAME } from './util/constant'

const t = createLocale(LOCALE_COMP_NAME)

export default defineComponent({
  name: COMPS_NAME.VE_PAGINATION,
  components: {
    Total: {
      render() {
        return (
          <span class={clsName('total')} aria-live="polite">
            {t('total', this.$parent.total)}
          </span>
        )
      },
    },

    Prev: {
      render() {
        const isDisabled = this.$parent.newPageIndex === 1
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
              aria-label={t('prevPage')}
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
      render() {
        const isDisabled = this.$parent.newPageIndex === this.$parent.pageCount
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
              aria-label={t('nextPage')}
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
      render() {
        return (
          <div class={clsName('select-wrapper')}>
            <span class={clsName('select-label')} id="ve-pagination-size-label">
              {t('pageSizeLabel')}
            </span>
            <VeSelect
              class={clsName('select')}
              modelValue={this.$parent.newPageSizeOption}
              popperAppendTo={this.$parent.popperAppendTo}
              aria-labelledby="ve-pagination-size-label"
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
            <label class={clsName('goto-label')} for="ve-pagination-jumper">
              {t('goto')}
            </label>
            <input
              id="ve-pagination-jumper"
              class={clsName('goto-input')}
              value={this.$parent.newPageIndex}
              onKeyup={this.jumperEnter}
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              aria-label={t('jumpToLabel')}
            />
            <span class={clsName('goto-suffix')} aria-hidden="true">
              {t('page')}
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
    popperAppendTo: {
      type: [String, HTMLElement],
      default() {
        return document.body
      },
    },
  },
  data() {
    return {
      newPageIndex:
                this.pageIndex && this.pageIndex > 0
                  ? Number.parseInt(`${this.pageIndex}`)
                  : 1,

      newPageSize: this.pageSize,
    }
  },

  computed: {
    pageCount() {
      return Math.ceil(this.total / this.newPageSize)
    },
    newPageSizeOption() {
      return this.pageSizeOption.map((x) => {
        const temp = {
          value: 0,
          label: '',
          selected: false,
        }

        temp.value = x
        temp.label = x + t('itemsPerPage')
        if (this.newPageSize === x)
          temp.selected = true

        return temp
      })
    },
  },
  watch: {
    pageIndex(newVal) {
      this.newPageIndex = newVal
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

    // 上一页
    prevPage() {
      if (this.newPageIndex > 1) {
        this.newPageIndex = this.newPageIndex - 1
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

    // 改变页面大小
    pageSizeChangeHandler() {
      const item = this.newPageSizeOption.find(x => x.selected)

      if (item) {
        this.newPageSize = item.value
        this.newPageIndex = 1
        this.$emit(EMIT_EVENTS.PAGE_SIZE_CHANGE, this.newPageSize)
      }
    },

    // 回到初始页码
    goBackPageIndex() {
      this.newPageIndex
                = this.pageIndex && this.pageIndex > 0
          ? Number.parseInt(`${this.pageIndex}`)
          : 1
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
      <nav class={clsName('nav')} aria-label={t('paginationLabel')}>
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
