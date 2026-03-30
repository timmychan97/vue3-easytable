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

You can modify and extend text content using the `VeLocale.update` method.

```javascript
import { VeLocale } from '@vue3-easytable/vue'

const lang = {
  pagination: {
    goto: 'Go to',
  },
}

VeLocale.update(lang)
```

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
