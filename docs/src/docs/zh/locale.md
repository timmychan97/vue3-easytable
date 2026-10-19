## 国际化

:::anchor 语言切换

你可以通过 `VeLocal` 组件实现多语言支持，使用 `VeLocal.use` 方法可以切换当前使用的语言。

```javascript
import { VeLocale } from 'vue-easytable'
// 引入英文语言包
import enUS from 'vue-easytable/libs/locale/lang/en-US.js'

VeLocale.use(enUS)
```

:::anchor 修改语言包

通过 `VeLocale.update` 方法可以实现文案的修改和扩展，只会修改传入的文案。

```javascript
import { VeLocale } from 'vue-easytable'

const lang = {
  分页: {
    前往: '跳转到',
  },
}

VeLocale.update(lang)
```

:::anchor 每个 app 单独设置语言

`VeLocale.use` 和 `VeLocale.update` 是全局的：会修改页面上所有 app 的语言。如果要让某个 app 使用自己的语言，请在安装插件时传给 `useVeTable`。每个 app 各自保存语言，第二个 app 不会切换第一个 app 的语言：

```javascript
import { useVeTable } from '@vue3-easytable/vue'
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US.js'
import zhCN from '@vue3-easytable/vue/libs/locale/lang/zh-CN.js'

createApp(AppA).use(useVeTable({ locale: enUS })).mount('#app-a')
// 不会改变 app A 的语言
createApp(AppB).use(useVeTable({ locale: zhCN })).mount('#app-b')
```

- `useVeTable({ locale })` 只设置该 app 的语言，不修改全局语言，`VeLocale.getMessage()` 返回的仍是全局语言。
- 组件中的 `this.$veLocale.use(...)` 和 `this.$veLocale.update(...)` 只修改该组件所在 app 的语言。
- `VeLocale.use(...)` 和 `VeLocale.update(...)` 仍然作用于所有 app（合并在各 app 自己的语言之上）。
- 在 app 内部，`VeConfigProvider` 为其子组件设置语言（合并在 app 的语言之上）。

:::anchor 文案键名

语言包按组件分组，所有语言包的键名相同（完整列表见 `zh-CN`）：

| 分组 | 键名 |
| ---- | ---- |
| `分页` | `前往`、`页`、`每页条数`、`合计`、`向前N页`、`向后N页`、`上一页`、`下一页`、`分页导航`、`第N页`、`当前页`、`跳转到`、`每页显示条数` |
| `表格` | `确认筛选`、`重置筛选`、`剪切`、`复制`、`上方插入行`、`下方插入行`、`删除行`、`清空行`、`清空列`、`清空单元格`、`左列冻结`、`取消左列冻结`、`右列冻结`、`取消右列冻结` |

`合计`、`向前N页`、`向后N页`、`第N页`、`当前页` 是函数，接收一个数字并返回文案，例如 ``合计: total => `共 ${total} 条` ``。

:::anchor 从英文键名迁移

:::tip
旧版本使用英文键名（`pagination.goto`、`table.cut` 等），现已**废弃**。`VeLocale.use` 和 `VeLocale.update` 仍然接受旧键名，会自动映射到新键名，并在每个旧键名第一次使用时输出一次 `console.warn`。请尽快改用新键名，英文键名将在后续版本中移除。
:::

| 旧键名 | 新键名 |
| ------ | ------ |
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

:::anchor CDN 方式加载语言文件

:::tip
1、从目录 “//unpkg.com/vue-easytable/libs/locale/lang/” 目录下引用需要的语言包<br>
2、使用 `VETable.VeLocale.use` 方法使用和切换语言包<br>
3、语言包固定格式为 `VETable.lang.[语言包名称]`，[语言包名称] 不包含‘-’符号，具体见下面示例<br>
:::

```
<script src="//unpkg.com/vue"></script>
<script src="//unpkg.com/vue-easytable"></script>
<script src="//unpkg.com/vue-easytable/libs/locale/lang/en-US.js"></script>
<script src="//unpkg.com/vue-easytable/libs/locale/lang/zh-CN.js"></script>

<script>
  // 切换到英文
  VETable.VeLocale.use(VETable.lang.enUS);

  /*
  切换中文
  VETable.VeLocale.use(VETable.lang.zhCN);
  */
</script>
```

:::anchor 语言包

目前支持以下语言：
| 语言 | 文件名 |
| -------- | ------ |
| 简体中文 | zh-CN |
| 繁體中文（中国台湾） | zh-TW |
| 英语（en） | en-US |
| 南非（荷兰语） | af-ZA |
| 南非（ZA） | zu-ZA |
| 法语（FR） | fr-FR |
| 巴西葡萄牙语 | pt-BR |
| 韩文(KR) | ko-KR |
| 俄语(RU) | ru-RU |

如果你需要使用其他的语言，欢迎贡献 PR：只需在 [这里](https://github.com/huangshuwei/vue-easytable/tree/master/packages/src/locale/lang) 添加一个语言配置文件即可。
