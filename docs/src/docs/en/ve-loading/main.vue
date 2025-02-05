<script>
import Api from './api.md'
import Collection from './collection.vue'
import Container from './container.md'
import Custom from './custom.md'
import Fullscreen from './fullscreen.md'
import Usage from './usage.md'

export default {
  components: {
    Usage,
    Container,
    Fullscreen,
    Custom,
    Collection,
    Api,
  },
}
</script>

<template>
  <div>
    <h2>Loading</h2>
    <Usage />
    <Container />
    <Fullscreen />
    <Custom />
    <Collection />
    <Api />
  </div>
</template>
