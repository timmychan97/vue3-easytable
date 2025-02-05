<script>
import AroundX from './around-x.md'
import AroundY from './around-y.md'
import BorderAll from './border-all.md'
import BorderAround from './border-around.md'
import BorderRadius from './border-radius.md'
import BorderX from './border-x.md'
import BorderY from './border-y.md'
import DefaultBorder from './default.md'
import Explain from './explain.md'

export default {
  name: 'Border',
  components: {
    Explain,
    DefaultBorder,
    BorderX,
    BorderY,
    BorderAround,
    BorderAll,
    AroundX,
    AroundY,
    BorderRadius,
  },
}
</script>

<template>
  <div>
    <h2>Table Border</h2>
    <Explain />
    <DefaultBorder />
    <BorderX />
    <BorderY />
    <BorderAround />
    <BorderAll />
    <AroundX />
    <AroundY />
    <BorderRadius />
  </div>
</template>
