:::tip
1. Nar du har data som ma kopieres gjentatte ganger, kan du autofylle celleinnhold akkurat som i Excel<br>
2. Autofyll hopper over operasjonskolonner og kolonner uten `field`: de fylles ikke, og ved vannrett autofyll lar en kildekolonne uten data målcellene sine være uendret<br>
3. Når `editOption` er satt, skriver autofyll bare til kolonner med `edit: true`, og kaller `editOption.beforeCellValueChange` / `afterCellValueChange` (og den utfasede `cellValueChange`) for hver celle der verdien endres, med samme `{ row, column, changeValue }` som ved celleredigering. Hvis `beforeCellValueChange` returnerer `false` (eller kaster en feil), hoppes bare den cellen over. Rekkefølge: `beforeAutofill` → `beforeCellValueChange` og skriving, per celle → `afterCellValueChange`, per skrevet celle → `afterAutofill`. Uten `editOption` fylles alle datakolonner, og celleverdi-tilbakekallene kalles ikke<br>
4. En autofyll som ikke har noe å skrive (den dekker bare kolonner den ikke kan skrive til, se 2 og 3, eller ved vannrett autofyll har kildekolonnene ingen data) gjør ingenting: `beforeAutofill` / `afterAutofill` kalles ikke, og markeringen forblir som den er

:::
