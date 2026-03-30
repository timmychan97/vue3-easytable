import type { LocaleMessage } from '../types'

export default {
  pagination: {
    goto: 'Go to',
    page: '',
    itemsPerPage: ' / page',
    total: total => `Total ${total}`,
    prev5: pagingCount => `Previous ${pagingCount} Pages`,
    next5: pagingCount => `Next ${pagingCount} Pages`,
    prevPage: 'Previous page',
    nextPage: 'Next page',
    paginationLabel: 'Pagination navigation',
    pageLabel: page => `Page ${page}`,
    currentPageLabel: page => `Page ${page}, current page`,
    jumpToLabel: 'Jump to page',
    pageSizeLabel: 'Items per page',
  },
  table: {
    // filter
    confirmFilter: 'Confirm',
    resetFilter: 'Reset',
    // contextmenu event
    cut: 'Cut',
    copy: 'Copy',
    insertRowAbove: 'Insert row above',
    insertRowBelow: 'Insert row below',
    removeRow: 'Remove $1 row',
    emptyRow: 'Empty $1 row',
    // removeColumn: "Remove column",
    emptyColumn: 'Empty $1 column',
    // hideColumn: "Hide column",
    emptyCell: 'Empty cell',
    leftFixedColumnTo: 'Left fixed column to',
    cancelLeftFixedColumnTo: 'Cancel left fixed column to',
    rightFixedColumnTo: 'Right fixed column to',
    cancelRightFixedColumnTo: 'Cancel right fixed column to',
  },
} as LocaleMessage
