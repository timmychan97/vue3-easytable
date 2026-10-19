:::anchor API

### props

| Parameter | Beskrivelse | Type | Valg | Standard |
| --------- | ----------- | ---- | ---- | -------- |
| locale | Språket for komponentene inni. Det slås sammen med språket utenfor (nærmeste ytre `VeConfigProvider`, ellers appens språk, ellers det globale språket), så det kan inneholde bare nøklene som skal endres. Nøklene står på siden [Internasjonalisering](./locale). Utfasede engelske nøkler godtas fortsatt og gir én advarsel per nøkkel. | `Object` | - | - |

### slots

| Navn | Beskrivelse |
| ---- | ----------- |
| default | Komponentene som bruker dette språket |
