<anchor label="API" />

### props

| Parameter   | Beskrivelse                      | Type      | Alternativer | Standard         |
| ----------- | -------------------------------- | --------- | ------------ | ---------------- |
| modelValue  | Verdi bundet av `v-model`        | `Array`   | -            | -                |
| width       | Bredde                           | `Number`  | -            | 90               |
| maxWidth    | Maks bredde                      | `Number`  | -            | -                |
| isMultiple  | Om flervalg er aktivert          | `Boolean` | -            | false            |
| placeholder | Plassholdertekst                 | `String`  | -            | "Velg et element" |
| textAlign   | Tekstjustering                   | `String`  | -            | "left"           |
| isInput     | Om inndatafelt støttes           | `Boolean` | -            | false            |

### Event

| Hendelsesnavn    | Beskrivelse               | Tilbakekallingsparametere |
| ---------------- | ------------------------- | ------------------------- |
| on-select-change | Hendelse ved valgsendring | options                   |
