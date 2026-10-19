## Internasjonalisering

:::anchor Sprakbytte

Du kan oppna flersprakstotte gjennom `VeLocale`-komponenten. Bruk `VeLocale.use`-metoden for a bytte gjeldende sprak.

```javascript
import { VeLocale } from '@vue3-easytable/vue'
// Importer den engelske sprakpakken
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US.js'

VeLocale.use(enUS)
```

:::anchor Endre sprakpakke

Du kan endre og utvide tekstinnhold ved hjelp av `VeLocale.update`-metoden. Bare tekstene du sender inn blir endret.

```javascript
import { VeLocale } from '@vue3-easytable/vue'

const lang = {
  分页: {
    前往: 'Ga til',
  },
}

VeLocale.update(lang)
```

:::anchor Språk per app

`VeLocale.use` og `VeLocale.update` er globale: de endrer språket i alle appene på siden. For å gi én app sitt eget språk sender du det til `useVeTable` når du installerer pluginen. Hver app har sitt eget språk, så en app nummer to bytter aldri språket i den første:

```javascript
import { useVeTable } from '@vue3-easytable/vue'
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US.js'
import zhCN from '@vue3-easytable/vue/libs/locale/lang/zh-CN.js'

createApp(AppA).use(useVeTable({ locale: enUS })).mount('#app-a')
// Endrer ikke språket i app A
createApp(AppB).use(useVeTable({ locale: zhCN })).mount('#app-b')
```

- `useVeTable({ locale })` angir språket for bare den appen. Det globale språket endres ikke, så `VeLocale.getMessage()` returnerer fortsatt det globale språket.
- `app.use(VeLocale, { locale })` gjør det samme, før eller etter `app.use(useVeTable())`. Hvis begge sender inn et språk, vinner det som installeres sist for nøklene det angir. Send det bare én gang per app: Vue hopper over en plugin som allerede er installert i appen, så en ny `app.use(VeLocale, { locale })` blir ignorert (Vue advarer bare i utviklingsmodus). For å bytte språk senere bruker du `this.$veLocale.use(...)` eller en `VeConfigProvider`.
- `this.$veLocale.use(...)` og `this.$veLocale.update(...)` i en komponent endrer bare språket i komponentens app.
- `VeLocale.use(...)` og `VeLocale.update(...)` gjelder fortsatt for alle apper, oppå hver apps eget språk.
- Inne i en app angir en `VeConfigProvider` språket for barna sine, oppå appens språk.

:::anchor Tekstnokler

Sprakpakkene er gruppert per komponent. Noklene er de samme i alle sprakpakker (se `zh-CN` for den fullstendige listen):

| Gruppe | Nokler |
| ------ | ------ |
| `分页` (paginering) | `前往`, `页`, `每页条数`, `合计`, `向前N页`, `向后N页`, `上一页`, `下一页`, `分页导航`, `第N页`, `当前页`, `跳转到`, `每页显示条数` |
| `表格` (tabell) | `确认筛选`, `重置筛选`, `剪切`, `复制`, `上方插入行`, `下方插入行`, `删除行`, `清空行`, `清空列`, `清空单元格`, `左列冻结`, `取消左列冻结`, `右列冻结`, `取消右列冻结` |

`合计`, `向前N页`, `向后N页`, `第N页` og `当前页` er funksjoner som far et tall og returnerer teksten, f.eks. ``合计: total => `Totalt ${total}` ``.

:::anchor Overgang fra de engelske noklene

:::tip
Tidligere versjoner brukte engelske nokler (`pagination.goto`, `table.cut`, ...). Disse er **foreldet**. `VeLocale.use` og `VeLocale.update` godtar dem fortsatt og oversetter hver av dem til den nye nokkelen, og skriver en `console.warn` forste gang hver gamle nokkel brukes. Bytt til de nye noklene. De engelske noklene blir fjernet i en fremtidig versjon.
:::

| Gammel nokkel | Ny nokkel |
| ------------- | --------- |
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

:::anchor Laste sprakfiler via CDN

:::tip
1. Referer til onskede sprakpakke fra katalogen "//unpkg.com/@vue3-easytable/vue/libs/locale/lang/"<br>
2. Bruk `VETable.VeLocale.use`-metoden for a bruke og bytte sprakpakker<br>
3. Sprakpakker folger det faste formatet `VETable.lang.[sprakpakkenavn]`, der [sprakpakkenavn] ikke inneholder '-'-symbolet. Se eksempelet nedenfor<br>
:::

```
<script src="//unpkg.com/vue"></script>
<script src="//unpkg.com/@vue3-easytable/vue"></script>
<script src="//unpkg.com/@vue3-easytable/vue/libs/locale/lang/en-US.js"></script>
<script src="//unpkg.com/@vue3-easytable/vue/libs/locale/lang/zh-CN.js"></script>

<script>
  // Bytt til engelsk
  VETable.VeLocale.use(VETable.lang.enUS);

  /*
  Bytt til kinesisk
  VETable.VeLocale.use(VETable.lang.zhCN);
  */
</script>
```

:::anchor Sprakpakker

For oyeblikket stottede sprak:
| Sprak | Filnavn |
| -------- | ------ |
| Forenklet kinesisk | zh-CN |
| Tradisjonelt kinesisk (Taiwan) | zh-TW |
| Engelsk | en-US |
| Afrikaans (Sor-Afrika) | af-ZA |
| Zulu (Sor-Afrika) | zu-ZA |
| Fransk | fr-FR |
| Brasiliansk portugisisk | pt-BR |
| Koreansk | ko-KR |
| Russisk | ru-RU |
| Norsk bokmål | nb-NO (`no-NB` er et utfaset alias) |

Hvis du trenger a bruke et annet sprak, er du velkommen til a bidra med en PR: bare legg til en sprakkonfigurasjonsfil [her](https://github.com/huangshuwei/vue-easytable/tree/master/packages/src/locale/lang).
