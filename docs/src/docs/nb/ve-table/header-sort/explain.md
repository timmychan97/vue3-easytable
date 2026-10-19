::: tip
1. Bruk egenskapen `sortBy` til å angi hvilke kolonner som er sorterbare. `sortBy="asc"`: standard stigende rekkefølge for kolonnen; `sortBy="desc"`: standard synkende rekkefølge for kolonnen; `sortBy=""`: tillater sortering, men uten standard sorteringsrekkefølge<br>
2. Bruk objektet `sortOption` til å konfigurere ytterligere sorteringsfunksjoner. Sorteringsfunksjonen fungerer med tilbakalkallingsfunksjonen `sortChange(param)`, som mottar kolonnens sorteringsregler som parameter<br>
3. Parameteret har `field` som nøkkel, f.eks. `{ age: 'asc', weight: '' }`. Hver kolonne har sin egen sorteringstilstand (etter `key`), så flere kolonner kan dele et `field`: parameteret viser da den første av dem som har en sorteringsrekkefølge. Sorterbare kolonner uten `field` kan også sorteres, men tas ikke med i parameteret
:::
