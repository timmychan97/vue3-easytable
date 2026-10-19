import { useI18N } from '@vue3-easytable/common/locale'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeIcon from '@vue3-easytable/ve-icon'
import { clsName } from './util'
import { LOCALE_COMP_NAME } from './util/constant'

export default defineComponent({
  name: 'VePaginationPager',
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
  emits: {
    // 点击的页码（由分页组件规范化并通知外部）
    jump: (_pageIndex: number) => true,
  },
  setup(props, { emit }) {
    // 解析语言包（最近的 ConfigProvider，否则为 app / 全局语言包）
    const t = useI18N(LOCALE_COMP_NAME)

    const numOffset = computed(() => Math.floor((props.pagingCount + 2) / 2) - 1)

    const showJumpPrev = computed(() => {
      return props.pageCount > props.pagingCount + 2 && props.pageIndex > props.pagingCount
    })

    const showJumpNext = computed(() => {
      return props.pageCount > props.pagingCount + 2 && props.pageIndex <= props.pageCount - props.pagingCount
    })

    // 当前要显示的数字按钮集合
    const pagingCounts = computed(() => {
      const result: number[] = []
      const { pageCount, pageIndex, pagingCount } = props

      if (showJumpPrev.value && !showJumpNext.value) {
        for (let i = pageCount - pagingCount; i < pageCount; i++)
          result.push(i)
      }
      else if (!showJumpPrev.value && showJumpNext.value) {
        for (let i = 2; i < pagingCount + 2; i++)
          result.push(i)
      }
      else if (showJumpPrev.value && showJumpNext.value) {
        for (let i = pageIndex - numOffset.value; i <= pageIndex + numOffset.value; i++)
          result.push(i)
      }
      else {
        for (let i = 2; i < pageCount; i++)
          result.push(i)
      }

      return result
    })

    function jumpPage(pageIndex: number) {
      emit('jump', pageIndex)
    }

    return () => {
      const { pageIndex, pagingCount, pageCount } = props

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
              aria-label={pageIndex === 1 ? t('当前页', 1) : t('第N页', 1)}
              aria-current={pageIndex === 1 ? 'page' : undefined}
            >
              1
            </button>
          </li>

          {showJumpPrev.value && (
            <li
              class={[
                pageIndex === 1 ? 'disabled' : '',
                clsName('li'),
                clsName('jump-prev'),
              ]}
              title={t('向前N页', pagingCount)}
              onClick={() => jumpPage(pageIndex - pagingCount)}
            >
              <button
                type="button"
                aria-label={t('向前N页', pagingCount)}
              >
                <VeIcon name={ICON_NAMES.DOUBLE_LEFT_ARROW} />
              </button>
            </li>
          )}
          {pagingCounts.value.map((number, index) => {
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
                  aria-label={isActive ? t('当前页', number) : t('第N页', number)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {number}
                </button>
              </li>
            )
          })}

          {showJumpNext.value && (
            <li
              class={[clsName('li'), clsName('jump-next')]}
              title={t('向后N页', pagingCount)}
              onClick={() => jumpPage(pageIndex + pagingCount)}
            >
              <button
                type="button"
                aria-label={t('向后N页', pagingCount)}
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
                aria-label={pageIndex === pageCount ? t('当前页', pageCount) : t('第N页', pageCount)}
                aria-current={pageIndex === pageCount ? 'page' : undefined}
              >
                {pageCount}
              </button>
            </li>
          )}
        </span>
      )
    }
  },
})
