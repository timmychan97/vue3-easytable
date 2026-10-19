:::tip
1. Use the `sortBy` property to set which columns are sortable. `sortBy="asc"`: default ascending order for the column; `sortBy="desc"`: default descending order for the column; `sortBy=""`: allows sorting but with no default sort order<br>
2. Use the `sortOption` object to configure additional sorting features. The sorting feature works with the `sortChange(param)` callback function, which receives the column sort rules as its parameter<br>
3. The parameter is keyed by `field`, e.g. `{ age: 'asc', weight: '' }`. Each column keeps its own sort state (by `key`), so several columns may share a `field`: the parameter then reports the first of them that has a sort order. Sortable columns without `field` sort as well but are not included in the parameter
:::
