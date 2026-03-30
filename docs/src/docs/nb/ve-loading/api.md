:::anchor API

### props

| Parameter              | Beskrivelse                                                                                   | Type                | Alternativer                        | Standard                   |
| ---------------------- | --------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------- | -------------------------- |
| name                   | Navn på innlastingseffekttype                                                                 | `String`            | Se eksempler under "Innlastingssamling" | "plane"                |
| target                 | DOM-element eller en strengselektor tilgjengelig via `document.querySelector`                 | `Object \| String`  | -                                   | -                          |
| fullscreen             | Om innlastingen skal vises i fullskjermmodus                                                  | `Boolean`           | -                                   | false                      |
| tip                    | Innlastingstekst                                                                              | `String`            | -                                   | -                          |
| color                  | Farge på innlastingsikon                                                                      | `String`            | -                                   | "#1890ff"                  |
| overlayBackgroundColor | Bakgrunnsfarge for overlegget                                                                 | `String`            | -                                   | "rgba(255, 255, 255, 0.5)" |
| height                 | Høyde på innlastingsikon                                                                      | `String \| Number`  | -                                   | 40                         |
| width                  | Bredde på innlastingsikon                                                                     | `String \| Number`  | -                                   | 40                         |

### methods

| Metodenavn | Beskrivelse                                                                                                   | Parametere |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| show       | Vis innlastingseffekten                                                                                       | -          |
| close      | Lukk innlastingseffekten                                                                                      | -          |
| destroy    | Som standard ødelegges ikke instansen ved lukking; kall denne metoden for å ødelegge innlastingsinstansen manuelt | -       |
