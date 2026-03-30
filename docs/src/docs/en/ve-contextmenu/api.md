:::anchor API

### props

| Parameter   | Description                                                        | Type         | Options | Default |
| ----------- | ------------------------------------------------------------------ | ------------ | ------- | ------- |
| eventTarget | Element on which the context menu is triggered                     | `HTMLElement \| String` | -      | -   |
| options     | Context menu items. Supports unlimited tree structure, see below   | `Array`      | -       | -       |

### options

| Parameter | Description                                                                  | Type      | Options | Default |
| --------- | ---------------------------------------------------------------------------- | --------- | ------- | ------- |
| label     | Displayed menu name                                                          | `String`  | -       | -       |
| type      | Menu type. Built-in separator type is 'SEPARATOR'. Used as callback parameter | `String`  | -       | -       |
| disabled  | Disable current menu item, click has no effect                               | `Boolean` | -       | -       |

### Event

| Event Name    | Description        | Parameters                  |
| ------------- | ------------------ | --------------------------- |
| on-node-click | Menu click callback | Type of the clicked menu item |

### Instance Methods

| Method Name     | Description                  | Parameters |
| --------------- | ---------------------------- | ---------- |
| hideContextmenu | Hide the current context menu | -          |
