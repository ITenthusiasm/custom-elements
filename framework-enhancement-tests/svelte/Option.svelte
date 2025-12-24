<svelte:element this={mounted() ? "combobox-option" : "option"} bind:this={customElement} {...rest}>
  {@render children?.()}
</svelte:element>

<script lang="ts">
  import { onMount } from "svelte";
  import type { HTMLComboboxOptionAttributes } from "svelte/elements";
  import type { ComboboxOption } from "@itenthusiasm/custom-elements/Combobox"
  import { getSelectContext } from "./Select.svelte";

  let { children, ...rest }: HTMLComboboxOptionAttributes = $props();
  const mounted = getSelectContext();

  let customElement: ComboboxOption | HTMLOptionElement;
  onMount(() => (customElement.defaultSelected = Boolean(rest.selected)));
</script>
