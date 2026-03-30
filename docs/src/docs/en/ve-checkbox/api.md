<anchor label="API" />

### props

| Parameter     | Description                                          | Type      | Options | Default |
| ------------- | ---------------------------------------------------- | --------- | ------- | ------- |
| modelValue    | Value bound by `v-model`                             | `String   | Number | Boolean` | -   | -   |
| label         | Checkbox label                                       | `String`  | -       | -       |
| disabled      | Whether selection is disabled                        | `Boolean` | -       | false   |
| indeterminate | Whether it is in indeterminate state                 | `Boolean` | -       | false   |
| isControlled  | Whether it is a controlled component, used with `isSelected` | `Boolean` | -       | false   |
| isSelected    | Whether selected. Takes effect when isControlled is true | `Boolean` | -       | false   |

### Event

| Event Name        | Description                      | Callback Parameters |
| ----------------- | -------------------------------- | ------------------- |
| on-checked-change | Callback when checked state changes | isChecked           |
