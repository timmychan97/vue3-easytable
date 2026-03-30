<anchor label="API" />

### props

| Parameter                          | Description                                                                     | Type       | Options | Default |
| ---------------------------------- | ------------------------------------------------------------------------------- | ---------- | ------- | ------- |
| modelValue                         | v-model input value                                                             | `Array`    | -       | -       |
| isSelect                           | Whether used for select component                                               | `Boolean`  | -       | false   |
| showOperation                      | Show operation buttons                                                          | `Boolean`  | -       | false   |
| width                              | Minimum width of the dropdown                                                   | `Number`   | -       | 90      |
| maxWidth                           | Maximum width of the dropdown                                                   | `Number`   | -       | 1000    |
| isMultiple                         | Whether it is a multiple selection dropdown                                     | `Boolean`  | -       | false   |
| textAlign                          | Text alignment of dropdown items                                                | `String`   | -       | "left"  |
| isInput                            | Whether it includes an input                                                    | `Boolean`  | -       | false   |
| confirmFilterText                  | Confirm button text                                                             | `String`   | -       | -       |
| resetFilterText                    | Reset button text                                                               | `String`   | -       | -       |
| hideByItemClick                    | Whether to hide the dropdown when an item is clicked                            | `Boolean`  | -       | false   |
| showRadio                          | Whether to show radio, takes effect in single selection mode                    | `Boolean`  | -       | false   |
| visible                            | Whether the dropdown is visible, takes effect when isControlled=true            | `Boolean`  | -       | false   |
| isControlled                       | Whether it is a controlled component                                            | `Boolean`  | -       | false   |
| isCustomContent                    | Whether to use custom dropdown content                                          | `Boolean`  | -       | false   |
| instance                           | Distance between the dropdown panel and the trigger element                     | `Number`   | -       | 12      |
| beforeVisibleChange({nextVisible}) | Callback before visibility state changes, return `false` to prevent the change  | `Function` | -       | 12      |

### Event

| Event Name                 | Description                              | Callback Parameters |
| -------------------------- | ---------------------------------------- | ------------------- |
| on-item-select-change      | Triggered when the selection changes     | options             |
| on-filter-confirm          | Callback when confirm button is clicked  | options             |
| on-filter-reset            | Callback when reset button is clicked    | options             |
| on-dropdown-visible-change | Callback when dropdown visibility toggles | isVisible           |
