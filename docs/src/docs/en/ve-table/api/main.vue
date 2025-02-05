<script>
import cellAutofillOption from './cell-autofill-option-props'
import CellSelectionOption from './cell-selection-option-props'
import CellSpanOption from './cell-span-option-props'
import CellStyleOption from './cell-style-option-props'
import CheckboxOption from './checkbox-option-props'
import clipboardOption from './clipboard-option-props'
import ColumnHiddenOption from './column-hidden-option-props'
import ColumnProps from './column-props'
import columnWidthResizeOption from './column-width-resize-option-props'
import contextmenuBodyOption from './contextmenu-body-option-props'
import contextmenuHeaderOption from './contextmenu-header-option-props'
import { db } from './db'
import EditOption from './edit-option-props'
import EventCustomOption from './event-custom-option-props'
import ExpandOption from './expand-option-props'
import InstanceMethods from './instance-methods'
import RadioOption from './radio-option-props'
import RowStyleOption from './row-style-option-props'
import SortOption from './sort-option-props'
import TableProps from './table-props'
import VirtualScrollOption from './virtual-scroll-option-props'

export default {
  components: {
    TableProps,
    ColumnProps,
    InstanceMethods,
    CellSpanOption,
    EventCustomOption,
    ColumnHiddenOption,
    CellStyleOption,
    RowStyleOption,
    ExpandOption,
    CheckboxOption,
    RadioOption,
    VirtualScrollOption,
    SortOption,
    CellSelectionOption,
    EditOption,
    ContextmenuHeaderOption: contextmenuHeaderOption,
    ContextmenuBodyOption: contextmenuBodyOption,
    CellAutofillOption: cellAutofillOption,
    ClipboardOption: clipboardOption,
    ColumnWidthResizeOption: columnWidthResizeOption,
  },
  data() {
    return {
      db,
    }
  },
}
</script>

<template>
  <div class="mb100">
    <h2>API</h2>
    <!-- table props -->
    <TableProps />
    <!-- columns -->
    <ColumnProps />
    <!-- instance methods -->
    <InstanceMethods />
    <!-- cell Span Option -->
    <CellSpanOption />
    <!-- column hidden Option -->
    <ColumnHiddenOption />
    <!-- cell Style Option -->
    <CellStyleOption />
    <!-- Row Style Option -->
    <RowStyleOption />
    <!-- expand Option -->
    <ExpandOption />
    <!-- checkbox Option -->
    <CheckboxOption />
    <!-- radio Option -->
    <RadioOption />
    <!-- virtual Scroll Option -->
    <VirtualScrollOption />
    <!-- sort Option -->
    <SortOption />
    <!-- Cell Selection Option -->
    <CellSelectionOption />
    <!-- edit Option -->
    <EditOption />
    <!-- contextmenu header option -->
    <ContextmenuHeaderOption />
    <!-- contextmenu body option -->
    <ContextmenuBodyOption />
    <!-- Event Custom Option -->
    <EventCustomOption />
    <!-- Cell Autofill Option -->
    <CellAutofillOption />
    <!-- Clipboard Option -->
    <ClipboardOption />
    <!-- Clipboard Option -->
    <ColumnWidthResizeOption />
  </div>
</template>
