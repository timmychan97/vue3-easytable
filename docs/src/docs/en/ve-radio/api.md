<anchor label="API" />

### props

| Parameter    | Description                                                | Type      | Options | Default |
| ------------ | ---------------------------------------------------------- | --------- | ------- | ------- |
| modelValue   | Value bound by `v-model`                                   | `Boolean` | -       | false   |
| disabled     | Disable selection                                          | `Boolean` | -       | false   |
| label        | label                                                      | `String`  | -       | -       |
| isControlled | Whether it is a controlled component, used with `isSelected` | `Boolean` | -       | false   |
| isSelected   | Whether selected. Takes effect when isControlled is true    | `Boolean` | -       | false   |

### Event

| Event Name      | Description          | Callback Parameters |
| --------------- | -------------------- | ------------------- |
| on-radio-change | Selection change event | isChecked          |
