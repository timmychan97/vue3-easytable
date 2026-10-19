import { withUse } from '@vue3-easytable/common/uses/with-use'
import VeTable from './ve-table'

export default withUse(VeTable)

// 列配置相关的类型（INFRA-17，只导出类型）
export type {
  ColumnFilterItem,
  ColumnFilterOption,
  ColumnFixedType,
  ColumnOption,
  RenderBodyCellParams,
  RenderFooterCellParams,
  RenderH,
  RenderHeaderCellParams,
} from './ve-table-types'
