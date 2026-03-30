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

Du kan endre og utvide tekstinnhold ved hjelp av `VeLocale.update`-metoden.

```javascript
import { VeLocale } from '@vue3-easytable/vue'

const lang = {
  pagination: {
    goto: 'Ga til',
  },
}

VeLocale.update(lang)
```

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

Hvis du trenger a bruke et annet sprak, er du velkommen til a bidra med en PR: bare legg til en sprakkonfigurasjonsfil [her](https://github.com/huangshuwei/vue-easytable/tree/master/packages/src/locale/lang).
