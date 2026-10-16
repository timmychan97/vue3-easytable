:::anchor Nøstede providere

Providere kan nøstes. Den innerste vinner for nøklene den setter, og alle andre nøkler hentes fra den ytre.

:::demo Den indre pagineringen endrer bare «Gå til» og beholder totalteksten fra den ytre.

```html
<template>
    <div>
        <ve-config-provider :locale="outerLocale">
            <ve-pagination :total="600" />
            <br />
            <ve-config-provider :locale="innerLocale">
                <ve-pagination :total="600" />
            </ve-config-provider>
        </ve-config-provider>
    </div>
</template>
<script>
    export default {
        data() {
            return {
                outerLocale: {
                    分页: {
                        前往: "Ytre: gå til",
                        合计: (total) => `Ytre: ${total} rader`,
                    },
                },
                innerLocale: {
                    分页: {
                        前往: "Indre: gå til",
                    },
                },
            };
        },
    };
</script>
```

:::
