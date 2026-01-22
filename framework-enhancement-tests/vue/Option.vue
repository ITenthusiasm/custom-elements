<!-- @fallthroughAttributes true -->
<script lang="ts" setup>
import { inject } from "vue";
import { mountedKey } from "./keys.js";

const mounted = inject(mountedKey);
</script>

<template>
  <combobox-option
    v-if="mounted"
    v-bind="$attrs"
    :selected.attr="$attrs.selected == null || $attrs.selected === false ? undefined : true"
  >
    <slot></slot>
  </combobox-option>
  <option v-else v-bind="$attrs">
    <slot></slot>
  </option>
</template>
