::: tip
1. Bruk konfigurasjonsobjektet `cellSpanOption` for å angi cellesammenslåing<br>
2. Bruk metoden `bodyCellSpan({row,column,rowIndex})` for å angi sammenslåing av kroppsceller<br>
3. Bruk metoden `footerCellSpan({row,column,rowIndex})` for å angi sammenslåing av bunntekstceller<br>
4. Egenskapen `colspan` angir antall kolonner som skal slås sammen; egenskapen `rowspan` angir antall rader som skal slås sammen<br>
5. For å implementere funksjonen må kolonner som ikke skal rendres angis ved å sette både `colspan` og `rowspan` til 0<br>
6. Som standard er det sammenslåtte innholdet innholdet i den rendrede cellen. For å tilpasse celleinnholdet, bruk `renderBodyCell({row,column,rowIndex},h)` i kombinasjon<br>
7. Se eksemplene nedenfor for detaljer

:::
