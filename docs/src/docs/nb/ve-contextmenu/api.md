:::anchor API

### props

| Parameter   | Beskrivelse                                                          | Type         | Alternativer | Standard |
| ----------- | -------------------------------------------------------------------- | ------------ | ------------ | -------- |
| eventTarget | Elementet kontekstmenyen utloses pa                                  | `HTMLElement \| String` | -      | -   |
| options     | Kontekstmenyelementer. Stotter ubegrenset trestruktur, se nedenfor   | `Array`      | -            | -        |

### options

| Parameter | Beskrivelse                                                                   | Type      | Alternativer | Standard |
| --------- | ----------------------------------------------------------------------------- | --------- | ------------ | -------- |
| label     | Vist menynavn                                                                 | `String`  | -            | -        |
| type      | Menytype. Innebygd skillelinjetype er 'SEPARATOR'. Brukes som tilbakekallingsparameter | `String`  | -            | -        |
| disabled  | Deaktiver gjeldende menyelement, klikk har ingen effekt                       | `Boolean` | -            | -        |

### Event

| Hendelsesnavn | Beskrivelse          | Parametere                      |
| ------------- | -------------------- | ------------------------------- |
| on-node-click | Menyklikk-tilbakekall | Typen til det klikkede menyelementet |

### Instance Methods

| Metodenavn      | Beskrivelse                   | Parametere |
| --------------- | ----------------------------- | ---------- |
| hideContextmenu | Skjul gjeldende kontekstmeny  | -          |
