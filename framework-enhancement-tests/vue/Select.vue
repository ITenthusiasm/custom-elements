<!-- @fallthroughAttributes true -->
<script lang="ts" setup>
import { ref, onMounted, provide, readonly } from "vue";
import { mountedKey } from "./keys.js";

defineOptions({ inheritAttrs: false });

const mounted = ref(false);
onMounted(() => (mounted.value = true));
provide(mountedKey, readonly(mounted));
</script>

<template>
  <select-enhancer v-if="mounted">
    <combobox-field v-bind="$attrs"></combobox-field>
    <combobox-listbox>
      <slot></slot>
    </combobox-listbox>
  </select-enhancer>
  <select v-else v-bind="$attrs">
    <slot></slot>
  </select>
</template>
