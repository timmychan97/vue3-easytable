<script lang="tsx" setup>
import { computed, reactive } from 'vue'
import locale from '../comp/locale'
import useI18n from '../comp/mixins/i18n-mixins'

const COLUMN_KEYS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]

const { currentDocLang } = useI18n()

// Filter state for each column
const filterValues = reactive<Record<string, string>>({})

// Original data (unfiltered)
let originalTableData: Record<string, string | number>[] = []

const state = reactive({
  // start row index
  startRowIndex: 0,
  columnWidthResizeOption: {
    enable: true,
  },
  virtualScrollOption: {
    // 是否开启
    enable: true,
    scrolling,
  },
  cellAutofillOption: {
    directionX: true,
    directionY: true,
    beforeAutofill: ({
      direction,
      sourceSelectionRangeIndexes,
      targetSelectionRangeIndexes,
      sourceSelectionData,
      targetSelectionData,
    }) => {},
    afterAutofill: ({
      direction,
      sourceSelectionRangeIndexes,
      targetSelectionRangeIndexes,
      sourceSelectionData,
      targetSelectionData,
    }) => {},
  },
  // sort option for column sorting
  sortOption: {
    multipleSort: true,
    sortChange: (params: Record<string, string>) => {
      sortChange(params)
    },
  },
  // edit option 可控单元格编辑
  editOption: {
    beforeCellValueChange: ({ row, column, changeValue }) => {},
    afterCellValueChange: ({ row, column, changeValue }) => {},
  },
  // contextmenu header option
  contextmenuHeaderOption: {
    /*
                    before contextmenu show.
                    In this function,You can change the `contextmenu` options
                    */
    beforeShow: ({
      isWholeColSelection,
      selectionRangeKeys,
      selectionRangeIndexes,
    }) => {
      //
    },
    // after menu click
    afterMenuClick: ({
      type,
      selectionRangeKeys,
      selectionRangeIndexes,
    }) => {
      //
    },

    // contextmenus
    contextmenus: [
      {
        type: 'CUT',
      },
      {
        type: 'COPY',
      },
      {
        type: 'SEPARATOR',
      },
      {
        type: 'EMPTY_COLUMN',
      },
      {
        type: 'SEPARATOR',
      },
      {
        type: 'LEFT_FIXED_COLUMN_TO',
      },
      {
        type: 'CANCEL_LEFT_FIXED_COLUMN_TO',
      },
      {
        type: 'RIGHT_FIXED_COLUMN_TO',
      },
      {
        type: 'CANCEL_RIGHT_FIXED_COLUMN_TO',
      },
    ],
  },

  // contextmenu body option
  contextmenuBodyOption: {
    /*
                    before contextmenu show.
                    In this function,You can change the `contextmenu` options
                    */
    beforeShow: ({
      isWholeRowSelection,
      selectionRangeKeys,
      selectionRangeIndexes,
    }) => {
      console.log('---contextmenu body beforeShow--')
      console.log('isWholeRowSelection::', isWholeRowSelection)
      console.log('selectionRangeKeys::', selectionRangeKeys)
      console.log(
        'selectionRangeIndexes::',
        selectionRangeIndexes,
      )
    },
    // after menu click
    afterMenuClick: ({
      type,
      selectionRangeKeys,
      selectionRangeIndexes,
    }) => {
      console.log('---contextmenu body afterMenuClick--')
      console.log('type::', type)
      console.log('selectionRangeKeys::', selectionRangeKeys)
      console.log(
        'selectionRangeIndexes::',
        selectionRangeIndexes,
      )
    },

    // contextmenus
    contextmenus: [
      {
        type: 'CUT',
      },
      {
        type: 'COPY',
      },
      {
        type: 'SEPARATOR',
      },
      {
        type: 'INSERT_ROW_ABOVE',
      },
      {
        type: 'INSERT_ROW_BELOW',
      },
      {
        type: 'SEPARATOR',
      },
      {
        type: 'REMOVE_ROW',
      },
      {
        type: 'EMPTY_ROW',
      },
      {
        type: 'EMPTY_CELL',
      },
    ],
  },
  rowStyleOption: {
    clickHighlight: false,
    hoverHighlight: false,
  },
  tableData: [] as any[],
})

// current local
const currentLocal = computed(() => {
  return locale[currentDocLang.value].completeDemo.demo2
})

// Create filter render function for a column
function createFilterRender(keyValue: string) {
  return ({ closeFn }: { showFn: () => void, closeFn: () => void }, h: any) => {
    return (
      <div class="custom-filter" style="padding: 10px; width: 200px;">
        <div style="margin-bottom: 10px;">
          <input
            type="text"
            placeholder={`Filter ${keyValue}...`}
            value={filterValues[keyValue] || ''}
            style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"
            onInput={(e: Event) => {
              filterValues[keyValue] = (e.target as HTMLInputElement).value
            }}
          />
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button
            style="padding: 4px 12px; border: 1px solid #ddd; background: #fff; cursor: pointer; border-radius: 4px;"
            onClick={() => {
              filterValues[keyValue] = ''
              applyFilters()
              closeFn()
            }}
          >
            Reset
          </button>
          <button
            style="padding: 4px 12px; border: none; background: #1890ff; color: #fff; cursor: pointer; border-radius: 4px;"
            onClick={() => {
              applyFilters()
              closeFn()
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    )
  }
}

const columns = computed(() => {
  const columns = [
    {
      field: 'index',
      key: 'index',
      // is operation column
      operationColumn: true,
      title: '',
      width: 55,
      fixed: 'left',
      renderBodyCell: renderRowIndex,
    },
    ...COLUMN_KEYS.map((keyValue) => {
      return {
        title: keyValue,
        field: keyValue,
        key: keyValue,
        width: 90,
        edit: true,
        // Enable sorting on all columns
        sortBy: '',
        // Enable filtering on all columns
        filterCustom: {
          defaultVisible: false,
          render: createFilterRender(keyValue),
          filterIcon: () => {
            // Show different icon color when filter is active
            const isFiltered = filterValues[keyValue] && filterValues[keyValue].length > 0
            return <ve-icon name="filter" style={{ color: isFiltered ? '#1890ff' : '#bfbfbf' }} />
          },
        },
      }
    }),
  ]

  return columns
})
initTableData()
// render row index
function renderRowIndex({ row, column, rowIndex }) {
  return <span>{rowIndex + state.startRowIndex + 1}</span>
}
function scrolling({
  startRowIndex,
  visibleStartIndex,
  visibleEndIndex,
  visibleAboveCount,
  visibleBelowCount,
}) {
  state.startRowIndex = startRowIndex
}

// Sort change handler
function sortChange(params: Record<string, string>) {
  // Apply sorting based on sort parameters
  const sortFields = Object.entries(params).filter(([_, order]) => order)

  if (sortFields.length === 0) {
    // No sorting, apply filters to original data
    applyFilters()
    return
  }

  // Sort the filtered data
  const dataToSort = [...state.tableData]
  dataToSort.sort((a, b) => {
    for (const [field, order] of sortFields) {
      const aVal = String(a[field] || '')
      const bVal = String(b[field] || '')
      const comparison = aVal.localeCompare(bVal)
      if (comparison !== 0) {
        return order === 'asc' ? comparison : -comparison
      }
    }
    return 0
  })

  state.tableData = dataToSort
}

// Apply filters to table data
function applyFilters() {
  let filteredData = [...originalTableData]

  // Apply each active filter
  for (const [field, value] of Object.entries(filterValues)) {
    if (value && value.length > 0) {
      const searchValue = value.toLowerCase()
      filteredData = filteredData.filter((row) => {
        const cellValue = String(row[field] || '').toLowerCase()
        return cellValue.includes(searchValue)
      })
    }
  }

  state.tableData = filteredData
}

function initTableData() {
  const tableData: Record<string, string | number>[] = []
  for (let i = 0; i < 1000; i++) {
    const dataItem: Record<string, string | number> = {
      rowKey: i,
    }

    COLUMN_KEYS.forEach((keyValue) => {
      dataItem[keyValue] = ''
    })

    if (i === 1 || i === 3) {
      dataItem.C = 'YOU'
      dataItem.D = 'CAN'
      dataItem.E = 'TRY'
      dataItem.F = 'ENTER'
      dataItem.G = 'SOME'
      dataItem.H = 'WORDS'
      dataItem.I = '!!!'
    }

    tableData.push(dataItem)
  }

  originalTableData = tableData
  state.tableData = tableData
}
</script>

<template>
  <div class="spreadsheet">
    <div>
      {{ currentLocal.description }}
      <br>
      <br>
    </div>
    <ve-table
      style="word-break: break-word"
      fixed-header
      :scroll-width="0"
      :max-height="500"
      border-y
      :columns="columns"
      :table-data="state.tableData"
      row-key-field-name="rowKey"
      :virtual-scroll-option="state.virtualScrollOption"
      :cell-autofill-option="state.cellAutofillOption"
      :edit-option="state.editOption"
      :sort-option="state.sortOption"
      :contextmenu-body-option="state.contextmenuBodyOption"
      :contextmenu-header-option="state.contextmenuHeaderOption"
      :row-style-option="state.rowStyleOption"
      :column-width-resize-option="state.columnWidthResizeOption"
    />
  </div>
</template>

<style lang="less">
.spreadsheet {
    padding: 0 100px;
    margin: 30px 0;
}
</style>
