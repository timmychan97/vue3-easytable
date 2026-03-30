<anchor label="API" />

### props

| Parameter    | Beskrivelse                                                                        | Type      | Alternativer | Standard |
| ------------ | ---------------------------------------------------------------------------------- | --------- | ------------ | -------- |
| modelValue   | Verdi bundet av `v-model`                                                          | `Boolean` | -            | false    |
| disabled     | Deaktiver valg                                                                     | `Boolean` | -            | false    |
| label        | Etikett                                                                            | `String`  | -            | -        |
| isControlled | Om det er en kontrollert komponent, brukes sammen med `isSelected`                 | `Boolean` | -            | false    |
| isSelected   | Om den er valgt. Har effekt når isControlled er satt til true                      | `Boolean` | -            | false    |

### Event

| Hendelsesnavn   | Beskrivelse              | Tilbakekallingsparametere |
| --------------- | ------------------------ | ------------------------- |
| on-radio-change | Hendelse ved valgsendring | isChecked                |
