::: tip
1. Bruk konfigurasjonsobjektet `cellStyleOption` for å angi cellestiler<br>
2. Bruk tilbakeroppsfunksjonsegenskapen `bodyCellClass({ row, column, rowIndex })` for å angi klassen for kroppsceller som oppfyller betingelsen<br>
3. Bruk tilbakeroppsfunksjonsegenskapen `headerCellClass({column, rowIndex})` for å angi klassen for overskriftsceller som oppfyller betingelsen<br>
4. Bruk tilbakeroppsfunksjonsegenskapen `footerCellClass({row, column, rowIndex})` for å angi klassen for bunntekstceller som oppfyller betingelsen<br>
5. `<style>`-taggen må ikke bruke `scoped`-attributtet<br>
6. Du kan også tilpasse cellestiler via `renderBodyCell`, `renderHeaderCell`, `renderFooterCell` osv.

:::
