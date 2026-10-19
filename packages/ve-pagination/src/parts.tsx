/**
 * 分页的子组件：合计、上一页、下一页、每页条数、跳转。
 * 只通过 props 读取状态、通过事件通知分页组件，不访问 `$parent`（MOD-10）。
 * 文案在各自的 setup 中解析（最近的 ConfigProvider，否则为 app / 全局语言包）。
 */
import type { PropType } from 'vue'
import { useI18N } from '@vue3-easytable/common/locale'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeIcon from '@vue3-easytable/ve-icon'
import VeSelect from '@vue3-easytable/ve-select'
import { clampPageIndex, clsName } from './util'
import { LOCALE_COMP_NAME } from './util/constant'

// 每页条数下拉框的选项
export interface PageSizeOption {
  value: number
  label: string
  selected: boolean
}

// 上一页 / 下一页共用的 props
const stepProps = {
  // 当前页
  pageIndex: {
    type: Number,
    required: true as const,
  },
  // 总页数
  pageCount: {
    type: Number,
    required: true as const,
  },
}

export const Total = defineComponent({
  name: 'VePaginationTotal',
  props: {
    total: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const t = useI18N(LOCALE_COMP_NAME)

    return () => (
      <span class={clsName('total')} aria-live="polite">
        {t('合计', props.total)}
      </span>
    )
  },
})

export const Prev = defineComponent({
  name: 'VePaginationPrev',
  props: stepProps,
  emits: ['prev'],
  setup(props, { emit }) {
    const t = useI18N(LOCALE_COMP_NAME)

    return () => {
      // 只有一页（包括 total = 0）时也禁用
      const isDisabled = props.pageIndex <= 1 || props.pageCount <= 1
      return (
        <li
          onClick={() => emit('prev')}
          class={[
            isDisabled ? clsName('disabled') : '',
            clsName('li'),
            clsName('prev'),
          ]}
        >
          <button
            type="button"
            aria-label={t('上一页')}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            tabindex={isDisabled ? -1 : 0}
          >
            <VeIcon name={ICON_NAMES.LEFT_ARROW} />
          </button>
        </li>
      )
    }
  },
})

export const Next = defineComponent({
  name: 'VePaginationNext',
  props: stepProps,
  emits: ['next'],
  setup(props, { emit }) {
    const t = useI18N(LOCALE_COMP_NAME)

    return () => {
      // 用 >=：total 变小后当前页可能超过总页数
      const isDisabled = props.pageIndex >= props.pageCount
      return (
        <li
          onClick={() => emit('next')}
          class={[
            isDisabled ? clsName('disabled') : '',
            clsName('li'),
            clsName('next'),
          ]}
        >
          <button
            type="button"
            aria-label={t('下一页')}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            tabindex={isDisabled ? -1 : 0}
          >
            <VeIcon name={ICON_NAMES.RIGHT_ARROW} />
          </button>
        </li>
      )
    }
  },
})

export const Sizer = defineComponent({
  name: 'VePaginationSizer',
  props: {
    // 下拉框选项（当前每页条数为 selected）
    options: {
      type: Array as PropType<PageSizeOption[]>,
      required: true,
    },
    popperAppendTo: {
      type: [String, Object] as PropType<string | HTMLElement>,
      default: undefined,
    },
  },
  emits: {
    // 选中的每页条数
    change: (_pageSize: number) => true,
  },
  setup(props, { emit }) {
    const t = useI18N(LOCALE_COMP_NAME)
    // 每个实例使用独立的元素 id，避免多个分页组件的 aria-labelledby 互相指向（useId 在 SSR 下也稳定）
    const labelId = `ve-pagination-size-label-${useId()}`

    function handleChange(items: PageSizeOption[]) {
      if (Array.isArray(items) && items.length > 0) {
        const item = items.find(x => x.selected)
        if (item)
          emit('change', item.value)
      }
    }

    return () => (
      <div class={clsName('select-wrapper')}>
        <span class={clsName('select-label')} id={labelId}>
          {t('每页显示条数')}
        </span>
        <VeSelect
          class={clsName('select')}
          modelValue={props.options}
          popperAppendTo={props.popperAppendTo}
          aria-labelledby={labelId}
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          onUpdate:modelValue={handleChange}
        />
      </div>
    )
  },
})

export const Jumper = defineComponent({
  name: 'VePaginationJumper',
  props: {
    pageIndex: {
      type: Number,
      required: true,
    },
    pageCount: {
      type: Number,
      required: true,
    },
  },
  emits: {
    // 跳转到的页码（已规范化到 1 … pageCount）
    jump: (_pageIndex: number) => true,
  },
  setup(props, { emit }) {
    const t = useI18N(LOCALE_COMP_NAME)
    // 每个实例使用独立的 id，label 的 for 只指向本实例的输入框
    const inputId = `ve-pagination-jumper-${useId()}`

    function jumperEnter(event: KeyboardEvent) {
      if (event.key !== 'Enter')
        return
      const target = event.target as HTMLInputElement
      const val = clampPageIndex(target.value, props.pageCount)
      // 页码不变时不会重新渲染，需要直接把输入框改回规范化后的值
      target.value = `${val}`
      emit('jump', val)
    }

    return () => (
      <span class={clsName('goto')}>
        <label class={clsName('goto-label')} for={inputId}>
          {t('前往')}
        </label>
        <input
          id={inputId}
          class={clsName('goto-input')}
          value={props.pageIndex}
          onKeyup={jumperEnter}
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          aria-label={t('跳转到')}
        />
        <span class={clsName('goto-suffix')} aria-hidden="true">
          {t('页')}
        </span>
      </span>
    )
  },
})
