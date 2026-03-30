## Tematilpasning

:::anchor Innebygde temaer
To temaer er tilgjengelige som standard: et blatt tema og et morkt tema.

#### Bruke det bla temaet

Importer stilene for det bla temaet:

```
import "@vue3-easytable/vue/libs/theme-default/index.css";
```

#### Bruke det morke temaet

```
import "@vue3-easytable/vue/libs/theme-dark/index.css";
```

:::anchor Tematilpasning

Stilene til @vue3-easytable/vue er skrevet i Less, med et sett med globale/komponent-stilvariabler definert. Du kan justere dem etter behov.

#### Tilpasning basert pa det bla temaet

Hvis temaet du trenger ligner pa det bla temaet, kan du tilpasse basert pa det. Alle stilvariabler for det bla temaet finnes **[her](https://github.com/huangshuwei/vue-easytable/blob/master/packages/theme-default/var.less)**.

Opprett en egen Less-variabelfil, f.eks. vue-easytable-variables.less, og importer den for a overstyre variablene i var.less.

```
@import '~@vue3-easytable/vue/packages/theme-default/index.less'; // Importer den offisielle Less-stilinngangsfilen
@import 'your-theme-file.less'; // Brukes til a overstyre variablene definert ovenfor
```

Deretter, i prosjektets inngangsfil, importer stilfilen ovenfor direkte (du trenger ikke a importere den kompilerte CSS-filen fra @vue3-easytable/vue):

```
import { createApp } from 'vue'
import { useVeTable } from '@vue3-easytable/vue'
import './vue-easytable-variables.less'

createApp(App).use(useVeTable())
```

#### Tilpasning basert pa det morke temaet

Hvis temaet du trenger ligner pa det morke temaet, kan du tilpasse basert pa det. Alle stilvariabler for det morke temaet finnes **[her](https://github.com/huangshuwei/vue-easytable/blob/master/packages/theme-dark/var.less)**.

Opprett en egen Less-variabelfil, f.eks. vue-easytable-variables.less, og importer den for a overstyre variablene i var.less.

```
@import '~@vue3-easytable/vue/packages/theme-dark/index.less'; // Importer den offisielle Less-stilinngangsfilen
@import 'your-theme-file.less'; // Brukes til a overstyre variablene definert ovenfor
```

Deretter, i prosjektets inngangsfil, importer stilfilen ovenfor direkte (du trenger ikke a importere den kompilerte CSS-filen fra @vue3-easytable/vue):

```
import { createApp } from 'vue'
import { useVeTable } from '@vue3-easytable/vue'
import './vue-easytable-variables.less'

createApp(App).use(useVeTable())
```
