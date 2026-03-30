import type { LocaleMessage } from '../types'

export default {
  分页: {
    前往: 'Go to',
    页: '',
    每页条数: ' / page',
    合计: total => `Total ${total}`,
    向前N页: pagingCount => `Previous ${pagingCount} pages`,
    向后N页: pagingCount => `Next ${pagingCount} pages`,
    上一页: 'Previous page',
    下一页: 'Next page',
    分页导航: 'Pagination navigation',
    第N页: page => `Page ${page}`,
    当前页: page => `Page ${page}, current page`,
    跳转到: 'Jump to page',
    每页显示条数: 'Items per page',
  },
  表格: {
    // filter
    确认筛选: 'Filter',
    重置筛选: 'Reset',
    // contextmenu
    剪切: 'Cut',
    复制: 'Copy',
    上方插入行: 'Insert row above',
    下方插入行: 'Insert row below',
    删除行: 'Delete $1 row(s)',
    清空行: 'Clear $1 row(s)',
    // 删除列: 'Delete $1 column(s)',
    清空列: 'Clear $1 column(s)',
    // 隐藏列: 'Hide $1 column(s)',
    清空单元格: 'Clear cell',
    左列冻结: 'Freeze column to left',
    取消左列冻结: 'Unfreeze left column',
    右列冻结: 'Freeze column to right',
    取消右列冻结: 'Unfreeze right column',
  },
} as LocaleMessage
