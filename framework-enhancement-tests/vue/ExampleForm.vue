<script lang="ts" setup>
import Select from "./Select.vue";
import Option from "./Option.vue";

const options = ["First", "Second", "Third", "Fourth", "Fifth"];
</script>

<template>
  <form>
    <Select name="ranking" filter>
      <Option v-for="(rank, i) in options" :value="i + 1" :selected="i === 2">
        {{ rank }}
      </Option>
    </Select>
  </form>
</template>
