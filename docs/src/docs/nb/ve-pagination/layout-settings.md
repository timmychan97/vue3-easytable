:::anchor Layoutinnstillinger

:::demo 1. Endre layouten ved å sette egenskapen `layout`.<br>2. Egenskapen `layout` støtter følgende alternativer:<br>`total`: vis totalt antall, `prev`: vis forrige side-knapp, `pager`: vis sidenummerknapper, `next`: vis neste side-knapp, `sizer`: vis sidestørrelsesvelger, `jumper`: vis hopp-inndataboks

```html
<template>
    <div>
        <div>
            <div class="mb20 bold">Uten sidenummerknapper</div>
            <ve-pagination :total="600" :layout="['total', 'prev', 'next', 'sizer', 'jumper']" />
        </div>
        <div>
            <div class="mt30 mb20 bold">Justert visningsrekkefølge</div>
            <ve-pagination
                :total="600"
                :layout="['total', 'sizer', 'prev', 'pager', 'next', 'jumper']"
            />
        </div>

        <div>
            <div class="mt30 mb20 bold">Full layout</div>
            <ve-pagination
                :total="600"
                :layout="['total', 'prev', 'pager', 'next', 'sizer', 'jumper']"
            />
        </div>
    </div>
</template>
```

:::
