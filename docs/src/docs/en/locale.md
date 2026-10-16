## Internationalization

:::anchor Language Switching

You can achieve multi-language support through the `VeLocale` component. Use the `VeLocale.use` method to switch the current language.

```javascript
import { VeLocale } from '@vue3-easytable/vue'
// Import the English language pack
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US.js'

VeLocale.use(enUS)
```

:::anchor Modify Language Pack

You can modify and extend text content using the `VeLocale.update` method. Only the messages you pass are changed.

```javascript
import { VeLocale } from '@vue3-easytable/vue'

const lang = {
  分页: {
    前往: 'Jump to',
  },
}

VeLocale.update(lang)
```

:::anchor Message Keys

Language packs are grouped by component. The keys are the same in every language pack (see `zh-CN` for the full list):

| Group | Keys |
| ----- | ---- |
| `分页` (pagination) | `前往`, `页`, `每页条数`, `合计`, `向前N页`, `向后N页`, `上一页`, `下一页`, `分页导航`, `第N页`, `当前页`, `跳转到`, `每页显示条数` |
| `表格` (table) | `确认筛选`, `重置筛选`, `剪切`, `复制`, `上方插入行`, `下方插入行`, `删除行`, `清空行`, `清空列`, `清空单元格`, `左列冻结`, `取消左列冻结`, `右列冻结`, `取消右列冻结` |

`合计`, `向前N页`, `向后N页`, `第N页` and `当前页` are functions that receive a number and return the text, e.g. ``合计: total => `Total ${total}` ``.

:::anchor Migrating from the English Keys

:::tip
Earlier versions used English keys (`pagination.goto`, `table.cut`, ...). They are **deprecated**. `VeLocale.use` and `VeLocale.update` still accept them and map each one to its new key, and log a `console.warn` the first time each old key is used. Please switch to the new keys. The English keys will be removed in a future version.
:::

| Old key | New key |
| ------- | ------- |
| `pagination.goto` | `分页.前往` |
| `pagination.page` | `分页.页` |
| `pagination.itemsPerPage` | `分页.每页条数` |
| `pagination.total` | `分页.合计` |
| `pagination.prev5` | `分页.向前N页` |
| `pagination.next5` | `分页.向后N页` |
| `pagination.prevPage` | `分页.上一页` |
| `pagination.nextPage` | `分页.下一页` |
| `pagination.paginationLabel` | `分页.分页导航` |
| `pagination.pageLabel` | `分页.第N页` |
| `pagination.currentPageLabel` | `分页.当前页` |
| `pagination.jumpToLabel` | `分页.跳转到` |
| `pagination.pageSizeLabel` | `分页.每页显示条数` |
| `table.confirmFilter` | `表格.确认筛选` |
| `table.resetFilter` | `表格.重置筛选` |
| `table.cut` | `表格.剪切` |
| `table.copy` | `表格.复制` |
| `table.insertRowAbove` | `表格.上方插入行` |
| `table.insertRowBelow` | `表格.下方插入行` |
| `table.removeRow` | `表格.删除行` |
| `table.emptyRow` | `表格.清空行` |
| `table.emptyColumn` | `表格.清空列` |
| `table.emptyCell` | `表格.清空单元格` |
| `table.leftFixedColumnTo` | `表格.左列冻结` |
| `table.cancelLeftFixedColumnTo` | `表格.取消左列冻结` |
| `table.rightFixedColumnTo` | `表格.右列冻结` |
| `table.cancelRightFixedColumnTo` | `表格.取消右列冻结` |

:::anchor Loading Language Files via CDN

:::tip
1. Reference the required language pack from the directory "//unpkg.com/@vue3-easytable/vue/libs/locale/lang/"<br>
2. Use the `VETable.VeLocale.use` method to use and switch language packs<br>
3. Language packs follow the fixed format `VETable.lang.[language pack name]`, where [language pack name] does not contain the '-' symbol. See the example below<br>
:::

```
<script src="//unpkg.com/vue"></script>
<script src="//unpkg.com/@vue3-easytable/vue"></script>
<script src="//unpkg.com/@vue3-easytable/vue/libs/locale/lang/en-US.js"></script>
<script src="//unpkg.com/@vue3-easytable/vue/libs/locale/lang/zh-CN.js"></script>

<script>
  // Switch to English
  VETable.VeLocale.use(VETable.lang.enUS);

  /*
  Switch to Chinese
  VETable.VeLocale.use(VETable.lang.zhCN);
  */
</script>
```

:::anchor Language Packs

Currently supported languages:
| Language | Filename |
| -------- | ------ |
| Simplified Chinese | zh-CN |
| Traditional Chinese (Taiwan) | zh-TW |
| English | en-US |
| Afrikaans (South Africa) | af-ZA |
| Zulu (South Africa) | zu-ZA |
| French | fr-FR |
| Brazilian Portuguese | pt-BR |
| Korean | ko-KR |
| Russian | ru-RU |

If you need to use another language, feel free to contribute a PR: simply add a language configuration file [here](https://github.com/huangshuwei/vue-easytable/tree/master/packages/src/locale/lang).
