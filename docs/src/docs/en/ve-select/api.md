<anchor label="API" />

### props

| Parameter   | Description          | Type      | Options | Default  |
| ----------- | -------------------- | --------- | ------- | -------- |
| modelValue  | Value bound by `v-model` | `Array`   | -       | -        |
| width       | Width                | `Number`  | -       | 90       |
| maxWidth    | Max width            | `Number`  | -       | -        |
| isMultiple  | Whether multi-select | `Boolean` | -       | false    |
| placeholder | Placeholder text     | `String`  | -       | "Please select" |
| textAlign   | Text alignment       | `String`  | -       | "left"   |
| isInput     | Whether to support input | `Boolean` | -    | false    |

### Event

| Event Name       | Description              | Callback Parameters |
| ---------------- | ------------------------ | ------------------- |
| on-select-change | Selection change event   | options             |
