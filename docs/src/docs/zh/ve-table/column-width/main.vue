<script>
import Explain from './explain.md'
import LongWord from './long-word.md'
import NoWidth from './no-width.md'
import PercentWidth from './percent-width.md'
import PxWidth from './px-width.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    NoWidth,
    PercentWidth,
    PxWidth,
    LongWord,
  },
}
</script>

<template>
  <div>
    <h2>列宽设置</h2>
    <Explain />
    <NoWidth />
    <PercentWidth />
    <PxWidth />
    <LongWord />
  </div>
</template>
