import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import { createLocale } from '@vue3-easytable/common/utils/index'
import VeIcon from '@vue3-easytable/ve-icon'
import { clsName } from './util'
import { LOCALE_COMP_NAME } from './util/constant'

const t = createLocale(LOCALE_COMP_NAME)

export default defineComponent({
  props: {
    pageCount: {
      type: Number,
      required: true,
    },
    pageIndex: {
      type: Number,
      required: true,
    },
    pagingCount: {
      type: Number,
      required: true,
    },
  },
  computed: {
    numOffset() {
      return Math.floor((this.pagingCount + 2) / 2) - 1
    },

    showJumpPrev() {
      if (this.pageCount > this.pagingCount + 2) {
        if (this.pageIndex > this.pagingCount)
          return true
      }
      return false
    },

    showJumpNext() {
      if (this.pageCount > this.pagingCount + 2) {
        if (this.pageIndex <= this.pageCount - this.pagingCount)
          return true
      }
      return false
    },

    // 当前要显示的数字按钮集合
    pagingCounts() {
      let startNum
      const result = []
      const showJumpPrev = this.showJumpPrev
      const showJumpNext = this.showJumpNext

      if (showJumpPrev && !showJumpNext) {
        startNum = this.pageCount - this.pagingCount
        for (let i = startNum; i < this.pageCount; i++)
          result.push(i)
      }
      else if (!showJumpPrev && showJumpNext) {
        for (let i = 2; i < this.pagingCount + 2; i++)
          result.push(i)
      }
      else if (showJumpPrev && showJumpNext) {
        for (
          let i = this.pageIndex - this.numOffset;
          i <= this.pageIndex + this.numOffset;
          i++
        )
          result.push(i)
      }
      else {
        for (let i = 2; i < this.pageCount; i++)
          result.push(i)
      }

      return result
    },
  },
  methods: {
    jumpPage(pageIndex: number) {
      this.$emit('jumpPageHandler', pageIndex)
    },
  },
  render() {
    const {
      pageIndex,
      jumpPage,
      showJumpPrev,
      pagingCount,
      pagingCounts,
      showJumpNext,
      pageCount,
    } = this

    return (
      <span class={clsName('pager')}>
        <li
          class={[
            pageIndex === 1 ? clsName('li-active') : '',
            clsName('li'),
          ]}
          onClick={() => jumpPage(1)}
        >
          <button
            type="button"
            aria-label={pageIndex === 1 ? t('currentPageLabel', 1) : t('pageLabel', 1)}
            aria-current={pageIndex === 1 ? 'page' : undefined}
          >
            1
          </button>
        </li>

        {showJumpPrev && (
          <li
            class={[
              pageIndex === 1 ? 'disabled' : '',
              clsName('li'),
              clsName('jump-prev'),
            ]}
            title={t('prev5', pagingCount)}
            onClick={() => jumpPage(pageIndex - pagingCount)}
          >
            <button
              type="button"
              aria-label={t('prev5', pagingCount)}
            >
              <VeIcon name={ICON_NAMES.DOUBLE_LEFT_ARROW} />
            </button>
          </li>
        )}
        {pagingCounts.map((number, index) => {
          const isActive = number === pageIndex
          return (
            <li
              key={index}
              class={[
                isActive ? clsName('li-active') : '',
                clsName('li'),
              ]}
              onClick={() => jumpPage(number)}
            >
              <button
                type="button"
                aria-label={isActive ? t('currentPageLabel', number) : t('pageLabel', number)}
                aria-current={isActive ? 'page' : undefined}
              >
                {number}
              </button>
            </li>
          )
        })}

        {showJumpNext && (
          <li
            class={[clsName('li'), clsName('jump-next')]}
            title={t('next5', pagingCount)}
            onClick={() => jumpPage(pageIndex + pagingCount)}
          >
            <button
              type="button"
              aria-label={t('next5', pagingCount)}
            >
              <VeIcon name={ICON_NAMES.DOUBLE_RIGHT_ARROW} />
            </button>
          </li>
        )}

        {pageCount > 1 && (
          <li
            class={[
              pageIndex === pageCount ? clsName('li-active') : '',
              clsName('li'),
            ]}
            onClick={() => jumpPage(pageCount)}
          >
            <button
              type="button"
              aria-label={pageIndex === pageCount ? t('currentPageLabel', pageCount) : t('pageLabel', pageCount)}
              aria-current={pageIndex === pageCount ? 'page' : undefined}
            >
              {pageCount}
            </button>
          </li>
        )}
      </span>
    )
  },
})
