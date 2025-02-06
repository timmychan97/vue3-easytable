<script>
import BaseMd from './base.md'
import Explain from './explain.md'
import Ranking from './ranking.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
    Ranking,
  },
}
</script>

<template>
  <div>
    <h2>Row Index</h2>
    <Explain />
    <BaseMd />
    <Ranking />
  </div>
</template>
