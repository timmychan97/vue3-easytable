:::anchor Bruk

`VeConfigProvider` angir språket for alle komponenter inni den, for eksempel `ve-table` og `ve-pagination`. Den endrer ikke det globale språket som settes med `VeLocale.use`, så komponenter utenfor beholder det globale språket.

`locale` slås sammen med språket utenfor: nærmeste ytre `VeConfigProvider`, eller det globale språket hvis det ikke finnes noen. Du kan sende inn en hel språkpakke, eller bare nøklene du vil endre. Objektet du sender inn, blir aldri endret.

:::demo Pagineringen inni bruker sine egne tekster. Den under bruker det globale språket.

```html
<template>
    <div>
        <ve-config-provider :locale="locale">
            <ve-pagination :total="600" />
        </ve-config-provider>
        <br />
        <ve-pagination :total="600" />
    </div>
</template>
<script>
    export default {
        data() {
            return {
                locale: {
                    分页: {
                        前往: "Gå til side",
                        合计: (total) => `${total} rader til sammen`,
                    },
                },
            };
        },
    };
</script>
```

:::
