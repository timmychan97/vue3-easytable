## Vanlige sporsmal

:::anchor scrollWidth-egenskapen
Q: Hvordan bruker man `scrollWidth`-egenskapen?

A: Nar bredden pa den ytre beholderen er mindre enn `scrollWidth`-verdien, vil det vises et horisontalt rullefelt. Nar bredden pa den ytre beholderen er storre enn `scrollWidth`-verdien, vil den tilpasse seg beholderbredden automatisk.

:::anchor Faste kolonner
Q: Hvorfor vises ikke noen kolonner etter at faste kolonner er satt?

A: Fordi `scrollWidth`-verdien er mindre enn summen av kolonner med eksplisitte bredder, vil kolonner uten angitt bredde eller med prosentbaserte bredder bli presset ut.

:::anchor rowKeyFieldName-egenskapen
Q: Nar bor `rowKeyFieldName`-egenskapen brukes?

A: Denne egenskapen sikrer korrekt gjengivelse nar data oppdateres. Den gjelder for folgende funksjoner: radutvidelse, enkeltvalg av rad, flervalg av rad, radklikk-utheving og virtuell rulling.

:::anchor Feil: 'ReferenceError: h is not defined'
Q: Hvorfor gir den egendefinerte kolonnevisningsfunksjonen `renderBodyCell` feilen 'ReferenceError: h is not defined'?

A: Se den [offisielle dokumentasjonen](https://cn.vuejs.org/v2/guide/render-function.html#JSX). Du kan **legge til** den andre parameteren for a fikse dette, for eksempel:

```
renderBodyCell: ({ row, column, rowIndex },h) => {
       return (<div>hello</div>);
}
```

:::anchor Lang tekst odelegger layouten
Q: Hvorfor fungerer ikke den angitte bredden nar celleinnholdet er for langt?

A: Nar celleteksten er for lang, kan den odelegge layouten. Du kan kontrollere dette med CSS-egenskapen [word-break](https://developer.mozilla.org/en-US/docs/Web/CSS/word-break) ([se dette eksempelet som referanse](#/nb/doc/table/column-width?anchor=long-text-destroys-layout)), for eksempel:

```html
<template>
    <ve-table style="word-break: break-all" :columns="columns" :table-data="tableData" />
</template>
```

:::anchor Egendefinerte rullefelt-stiler
Q: Hvordan tilpasser man rullefelt-stiler?

A: Komponenten har ikke innebygde egendefinerte rullefelt-stiler. Du kan tilpasse dem etter behov. For tilpasning av rullefelt-stiler, se: https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar
