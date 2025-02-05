<script lang="ts" setup>
import Api from './api.md'
import BaseUsage from './base-usage.md'
import CallbackEvents from './callback-events.md'
import LayoutSettings from './layout-settings.md'
import PageIndex from './page-index.md'
import PageSize from './page-size.md'
import PagingButtons from './paging-buttons.md'
import PagingConfiguration from './paging-configuration.md'
import Usage from './usage.md'
</script>

<template>
  <div>
    <h2>Pagination 分页</h2>
    <Usage />
    <BaseUsage />
    <PageIndex />
    <PageSize />
    <PagingButtons />
    <PagingConfiguration />
    <CallbackEvents />
    <LayoutSettings />
    <Api />
  </div>
</template>
