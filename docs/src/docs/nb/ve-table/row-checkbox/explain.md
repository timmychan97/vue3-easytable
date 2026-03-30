:::tip
1. Aktiver flervalgfunksjonalitet via `checkboxOption`-egenskapen.<br>
2. Sett `type=checkbox` i `columns` for a angi avkrysningskolonnen<br>
3. Sett `rowKeyFieldName`-egenskapen til kolonnenavnet som tilsvarer raddataene<br>
4. `selectedRowChange` er hendelsen for radendring. Den mottar 3 parametere: `row` (gjeldende raddata), `isSelected` (om gjeldende rad er valgt), og `selectedRowKeys` (alle valgte rowKey-verdier).<br>
5. `selectedAllChange` er hendelsen for velg alle. Den mottar 2 parametere: `isSelected` (om alle er valgt) og `selectedRowKeys` (alle valgte rowKey-verdier)
:::
