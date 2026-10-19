:::tip
1. Aktiver flervalgfunksjonalitet via `checkboxOption`-egenskapen.<br>
2. Sett `type=checkbox` i `columns` for a angi avkrysningskolonnen<br>
3. Sett `rowKeyFieldName`-egenskapen til kolonnenavnet som tilsvarer raddataene<br>
4. `selectedRowChange` er hendelsen for radendring. Den mottar 3 parametere: `row` (gjeldende raddata), `isSelected` (om gjeldende rad er valgt), og `selectedRowKeys` (alle valgte rowKey-verdier).<br>
5. `selectedAllChange` er hendelsen for velg alle. Den mottar 2 parametere: `isSelected` (om alle er valgt) og `selectedRowKeys` (alle valgte rowKey-verdier)<br>
6. Velg alle / fjern alle endrer bare radene i gjeldende `tableData`. Valgte nøkler som ikke finnes i gjeldende data (for eksempel rader på andre sider) blir værende i `selectedRowKeys`, slik at et utvalg kan strekke seg over flere sider. Deaktiverte rader beholder tilstanden sin<br>
7. Å fjerne en valgt rad fra `tableData` fjerner ikke valget: nøkkelen blir værende i `selectedRowKeys` (tabellen kan ikke skille en fjernet rad fra en rad på en annen side), og en senere rad med samme nøkkel vises som valgt. For å fjerne nøkkelen, bruk kontrollert `selectedRowKeys` og fjern nøkkelen sammen med raden
:::
