:::anchor API

### props

| Parameter      | Description                                                                                                                                                                                                    | Type     | Options                                               | Default                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- | ----------------------------------------------------- |
| layout         | Layout settings                                                                                                                                                                                                | `Array`  | ['total', 'prev', 'pager', 'next', 'sizer', 'jumper'] | ['total', 'prev', 'pager', 'next', 'sizer', 'jumper'] |
| total          | Total count                                                                                                                                                                                                    | `Number` | -                                                     | -                                                     |
| pageIndex      | Current page number                                                                                                                                                                                            | `Number` | -                                                     | 1                                                     |
| pagingCount    | Number of buttons between the first 5 pages and last 5 pages                                                                                                                                                   | `Number` | -                                                     | 5                                                     |
| pageSize       | Page size                                                                                                                                                                                                      | `Number` | -                                                     | 10                                                    |
| pageSizeOption | Page size dropdown options                                                                                                                                                                                     | `Array`  | -                                                     | [10, 20, 30]                                          |
| popperAppendTo | Parent node for the dropdown popup layer. Defaults to rendering on `body`. If you encounter scrolling positioning issues with menus, try changing this to the scrollable area and positioning relative to it. [Example](https://codesandbox.io/s/vue-easytable-2-15-0-example-forked-q9k3m0?file=/Example.vue) | `String  \| HTMLElement`                                          | -                                                     | document.body |

### Event

| Event Name            | Description                      | Callback Parameters |
| --------------------- | -------------------------------- | ------------------- |
| on-page-number-change | Page number change callback event | Current page number |
| on-page-size-change   | Page size change callback         | Page size           |
