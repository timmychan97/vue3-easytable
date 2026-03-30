<anchor label="API" />

### props

| Parameter     | Beskrivelse                                          | Type      | Alternativer | Standard |
| ------------- | ---------------------------------------------------- | --------- | ------------ | -------- |
| modelValue    | Verdi bundet med `v-model`                           | `String   | Number | Boolean` | -   | -   |
| label         | Avkrysningsboks-etikett                              | `String`  | -            | -        |
| disabled      | Om valg er deaktivert                                | `Boolean` | -            | false    |
| indeterminate | Om den er i delvis valgt tilstand                    | `Boolean` | -            | false    |
| isControlled  | Om det er en kontrollert komponent, brukes med `isSelected` | `Boolean` | -            | false    |
| isSelected    | Om den er valgt. Gjelder nar isControlled er true    | `Boolean` | -            | false    |

### Event

| Hendelsesnavn     | Beskrivelse                          | Tilbakekallingsparametere |
| ----------------- | ------------------------------------ | ------------------------- |
| on-checked-change | Tilbakekall nar avkrysningsstatus endres | isChecked                 |
