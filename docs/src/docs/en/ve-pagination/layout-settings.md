:::anchor Layout Settings

:::demo 1. Change the layout by setting the `layout` property.<br>2. The `layout` property supports the following options:<br>`total`: show total count, `prev`: show previous page button, `pager`: show page number buttons, `next`: show next page button, `sizer`: show page size selector, `jumper`: show jump input box

```html
<template>
    <div>
        <div>
            <div class="mb20 bold">Without page number buttons</div>
            <ve-pagination :total="600" :layout="['total', 'prev', 'next', 'sizer', 'jumper']" />
        </div>
        <div>
            <div class="mt30 mb20 bold">Adjusted display order</div>
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
