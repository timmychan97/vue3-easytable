import type { LocaleMessage } from '../types'

export default {
  pagination: {
    goto: '前往',
    page: '页',
    itemsPerPage: ' 条/页',
    total: total => `共 ${total} 条`,
    prev5: pagingCount => `向前 ${pagingCount} 页`,
    next5: pagingCount => `向后 ${pagingCount} 页`,
    prevPage: '上一页',
    nextPage: '下一页',
    paginationLabel: '分页导航',
    pageLabel: page => `第 ${page} 页`,
    currentPageLabel: page => `第 ${page} 页，当前页`,
    jumpToLabel: '跳转到指定页',
    pageSizeLabel: '每页显示条数',
  },
  table: {
    // filter
    confirmFilter: '筛选',
    resetFilter: '重置',
    // contextmenu
    cut: '剪切',
    copy: '复制',
    insertRowAbove: '上方插入行',
    insertRowBelow: '下方插入行',
    removeRow: '删除 $1 行',
    emptyRow: '清空 $1 行',
    // removeColumn: "删除 $1 列",
    emptyColumn: '清空 $1 列',
    // hideColumn: "隐藏 $1 列",
    emptyCell: '清空单元格',
    leftFixedColumnTo: '左列冻结',
    cancelLeftFixedColumnTo: '取消左列冻结',
    rightFixedColumnTo: '右列冻结',
    cancelRightFixedColumnTo: '取消右列冻结',
  },
} as LocaleMessage
