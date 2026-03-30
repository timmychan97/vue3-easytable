<anchor label="API" />

### props

| Parameter                          | Beskrivelse                                                                       | Type       | Alternativer | Standard |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------- | ------------ | -------- |
| modelValue                         | v-model inngangsverdi                                                             | `Array`    | -            | -        |
| isSelect                           | Om den brukes for select-komponent                                                | `Boolean`  | -            | false    |
| showOperation                      | Vis operasjonsknapper                                                             | `Boolean`  | -            | false    |
| width                              | Minimumsbredde for nedtrekkslisten                                                | `Number`   | -            | 90       |
| maxWidth                           | Maksimal bredde for nedtrekkslisten                                               | `Number`   | -            | 1000     |
| isMultiple                         | Om det er en flervalgs-nedtrekksliste                                             | `Boolean`  | -            | false    |
| textAlign                          | Tekstjustering for nedtrekkslisteelementer                                        | `String`   | -            | "left"   |
| isInput                            | Om den inneholder et tekstfelt                                                    | `Boolean`  | -            | false    |
| confirmFilterText                  | Bekreft-knappetekst                                                               | `String`   | -            | -        |
| resetFilterText                    | Tilbakestill-knappetekst                                                          | `String`   | -            | -        |
| hideByItemClick                    | Om nedtrekkslisten skal skjules nar et element klikkes                            | `Boolean`  | -            | false    |
| showRadio                          | Om radioknapp skal vises, gjelder i enkeltvalg-modus                              | `Boolean`  | -            | false    |
| visible                            | Om nedtrekkslisten er synlig, gjelder nar isControlled=true                       | `Boolean`  | -            | false    |
| isControlled                       | Om det er en kontrollert komponent                                                | `Boolean`  | -            | false    |
| isCustomContent                    | Om egendefinert nedtrekksinnhold skal brukes                                      | `Boolean`  | -            | false    |
| instance                           | Avstand mellom nedtrekkspanelet og utloserelementet                               | `Number`   | -            | 12       |
| beforeVisibleChange({nextVisible}) | Tilbakekall for synlighetsendring, returner `false` for a forhindre endringen     | `Function` | -            | 12       |

### Event

| Hendelsesnavn              | Beskrivelse                                  | Tilbakekallingsparametere |
| -------------------------- | -------------------------------------------- | ------------------------- |
| on-item-select-change      | Utloses nar valget endres                    | options                   |
| on-filter-confirm          | Tilbakekall nar bekreft-knappen klikkes      | options                   |
| on-filter-reset            | Tilbakekall nar tilbakestill-knappen klikkes | options                   |
| on-dropdown-visible-change | Tilbakekall nar nedtrekkslistens synlighet endres | isVisible                 |
