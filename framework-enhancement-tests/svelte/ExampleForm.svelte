<form>
  <Select name="ranking" filter>
    {#each options as rank, i}
      <Option value={`${i + 1}`} selected={i === 2}>
        {rank}
      </Option>
    {/each}
  </Select>
</form>

<script lang="ts">
  import Select from "./Select.svelte";
  import Option from "./Option.svelte";

  const options = ["First", "Second", "Third", "Fourth", "Fifth"];
</script>
