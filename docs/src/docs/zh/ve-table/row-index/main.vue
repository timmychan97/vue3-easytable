<script>
import Base from './base.md'
import Explain from './explain.md'
import Ranking from './ranking.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    Base,
    Ranking,
  },
}
</script>

<template>
  <div>
    <h2>行序号</h2>
    <Explain />
    <Base />
    <Ranking />
  </div>
</template>
