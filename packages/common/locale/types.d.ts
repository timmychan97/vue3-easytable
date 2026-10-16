/**
 * 语言包类型。键名与默认语言包 zh-CN 一致（自 81a1ebb 起使用中文键）。
 * 每个内置语言包都以 `satisfies LocaleMessage` 声明，缺少或多出的键都会让 vue-tsc 报错。
 */

/** 分页 */
export interface PaginationLocaleMessage {
  前往: string
  页: string
  每页条数: string
  合计: (total: number) => string
  向前N页: (pagingCount: number) => string
  向后N页: (pagingCount: number) => string
  上一页: string
  下一页: string
  分页导航: string
  第N页: (page: number) => string
  当前页: (page: number) => string
  跳转到: string
  每页显示条数: string
}

/** 表格（筛选、右键菜单） */
export interface TableLocaleMessage {
  确认筛选: string
  重置筛选: string
  剪切: string
  复制: string
  上方插入行: string
  下方插入行: string
  删除行: string
  清空行: string
  清空列: string
  清空单元格: string
  左列冻结: string
  取消左列冻结: string
  右列冻结: string
  取消右列冻结: string
}

/** 完整的语言包 */
export interface LocaleMessage {
  分页: PaginationLocaleMessage
  表格: TableLocaleMessage
}

/**
 * 81a1ebb 之前的英文键（已废弃）。
 * 仍然可以传给 `VeLocale.use` / `VeLocale.update`，会被映射到新的中文键并给出一次弃用警告。
 * 映射表见 `legacy-keys.ts`。
 */
export interface DeprecatedLocaleMessage {
  /** @deprecated 请使用 `分页` */
  pagination?: {
    /** @deprecated 请使用 `分页.前往` */
    goto?: string
    /** @deprecated 请使用 `分页.页` */
    page?: string
    /** @deprecated 请使用 `分页.每页条数` */
    itemsPerPage?: string
    /** @deprecated 请使用 `分页.合计` */
    total?: (total: number) => string
    /** @deprecated 请使用 `分页.向前N页` */
    prev5?: (pagingCount: number) => string
    /** @deprecated 请使用 `分页.向后N页` */
    next5?: (pagingCount: number) => string
    /** @deprecated 请使用 `分页.上一页` */
    prevPage?: string
    /** @deprecated 请使用 `分页.下一页` */
    nextPage?: string
    /** @deprecated 请使用 `分页.分页导航` */
    paginationLabel?: string
    /** @deprecated 请使用 `分页.第N页` */
    pageLabel?: (page: number) => string
    /** @deprecated 请使用 `分页.当前页` */
    currentPageLabel?: (page: number) => string
    /** @deprecated 请使用 `分页.跳转到` */
    jumpToLabel?: string
    /** @deprecated 请使用 `分页.每页显示条数` */
    pageSizeLabel?: string
  }
  /** @deprecated 请使用 `表格` */
  table?: {
    /** @deprecated 请使用 `表格.确认筛选` */
    confirmFilter?: string
    /** @deprecated 请使用 `表格.重置筛选` */
    resetFilter?: string
    /** @deprecated 请使用 `表格.剪切` */
    cut?: string
    /** @deprecated 请使用 `表格.复制` */
    copy?: string
    /** @deprecated 请使用 `表格.上方插入行` */
    insertRowAbove?: string
    /** @deprecated 请使用 `表格.下方插入行` */
    insertRowBelow?: string
    /** @deprecated 请使用 `表格.删除行` */
    removeRow?: string
    /** @deprecated 请使用 `表格.清空行` */
    emptyRow?: string
    /** @deprecated 请使用 `表格.清空列` */
    emptyColumn?: string
    /** @deprecated 请使用 `表格.清空单元格` */
    emptyCell?: string
    /** @deprecated 请使用 `表格.左列冻结` */
    leftFixedColumnTo?: string
    /** @deprecated 请使用 `表格.取消左列冻结` */
    cancelLeftFixedColumnTo?: string
    /** @deprecated 请使用 `表格.右列冻结` */
    rightFixedColumnTo?: string
    /** @deprecated 请使用 `表格.取消右列冻结` */
    cancelRightFixedColumnTo?: string
  }
}

/**
 * 用户传入的语言包（`VeLocale.use` / `VeLocale.update` / `useVeTable({ locale })`）：
 * 新键可以只覆盖一部分，也接受已废弃的英文键。
 */
export type LocaleMessageInput = {
  [S in keyof LocaleMessage]?: Partial<LocaleMessage[S]>
} & DeprecatedLocaleMessage
