<script>
import AutoHeight from './auto-height.md'
import CalcHeight from './calc-height.md'
import Explain from './explain.md'
import FixedHeight from './fixed-height.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    AutoHeight,
    FixedHeight,
    CalcHeight,
  },
}
</script>

<template>
  <div>
    <h2>Table Height</h2>
    <Explain />
    <AutoHeight />
    <FixedHeight />
    <CalcHeight />
  </div>
</template>
