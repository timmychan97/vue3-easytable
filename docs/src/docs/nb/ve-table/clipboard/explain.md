:::tip
1. Du kan velge celler og utfore massekopering, innliming, klipping og sletting, akkurat som i Excel<br>
2. **Kopier** og **Klipp ut** i høyreklikkmenyen skriver med Clipboard API (`navigator.clipboard`) og faller tilbake til `document.execCommand("copy")` når det ikke er tilgjengelig (for eksempel utenfor en sikker kontekst). Hvis begge feiler, kalles `clipboardOption.writeError({ type, error, text, data, selectionRangeIndexes, selectionRangeKeys })` (uten den logges en advarsel), og en mislykket klipping lar cellene være uendret<br>
3. Innliming, klipping og sletting hopper over operasjonskolonner og kolonner uten `field`, og de andre kolonnene beholder plasseringen sin

:::
