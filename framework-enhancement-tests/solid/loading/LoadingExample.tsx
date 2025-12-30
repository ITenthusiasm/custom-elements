/** @jsxImportSource solid-js */
import { createSignal, For } from "solid-js";
import type { ComboboxField } from "@itenthusiasm/custom-elements";
import Select, { Option } from "../Select.jsx";

/** The default timeout used for simulating network request latencies. */
const defaultTimeout = 2000;

export default function LoadingExample() {
  /* -------------------- Manage Async Options -------------------- */
  const [options, setOptions] = createSignal<Pokemon[]>([]);

  let timeout: number | undefined;
  let controller: AbortController | undefined;
  async function handleFilterchange(event: Event): Promise<void> {
    event.preventDefault();
    controller?.abort(); // Cancel the currently-pending request if one exists
    clearTimeout(timeout); // Debounce the event handler

    const comboboxField = event.currentTarget as ComboboxField;
    comboboxField.setAttribute("data-status", "idle");

    controller = new AbortController();
    timeout = window.setTimeout(async () => {
      const search = comboboxField.text.data;
      if (!search) {
        comboboxField.setAttribute("data-status", "success");
        return setOptions([]);
      }

      comboboxField.setAttribute("data-status", "pending");
      try {
        const pokemon = await fetchPokemon(search, { signal: controller?.signal });
        setOptions(pokemon);
        comboboxField.setAttribute("data-status", "success");
      } catch (_err) {
        // Handle `abort`ed Requests or Request failures here as desired
      }
    }, 1000);
  }

  /* -------------------- Useful Event Handlers -------------------- */
  /** Tracks the user's most recently-selected value */
  function handleChange(event: Event): void {
    const comboboxField = event.currentTarget as ComboboxField;
    if (comboboxField.text.data === "") return comboboxField.setAttribute("data-last-pokemon", "");

    const currentOption = comboboxField.getOptionByValue(comboboxField.value as string);
    if (comboboxField.matches(":focus") && currentOption) {
      comboboxField.setAttribute("data-last-pokemon", currentOption.label);
    }
  }

  /** Restores the `combobox` to a proper state on `collapse` */
  function handleToggle(event: ToggleEvent) {
    if (event.newState !== "closed") return;

    // Cancel any pending operations
    controller?.abort();
    clearTimeout(timeout);

    // Restore the last user-selected value on `collapse` (or clear it if the user deleted it)
    const comboboxField = event.currentTarget as ComboboxField;
    comboboxField.value = comboboxField.getAttribute("data-last-pokemon") ?? "";

    // Force cursor to end if the `combobox` still has focus
    if (!comboboxField.matches(":focus")) return;
    const selection = document.getSelection();
    const { text } = comboboxField;
    selection?.setBaseAndExtent(text, text.length, text, text.length);
  }

  /** Blocks the `Enter` key while `option`s are loading */
  function handleKeyDown(event: KeyboardEvent): void {
    const comboboxField = event.currentTarget as ComboboxField;
    const status = comboboxField.getAttribute("data-status");
    if (event.key === "Enter" && status !== "success") event.preventDefault();
  }
  return (
    <form>
      <div class="form-field">
        <label for="pokemon">Pokemon</label>
        <Select
          id="pokemon"
          name="pokemon"
          filter
          attr:valueis="anyvalue"
          onChange={handleChange}
          onToggle={handleToggle}
          onKeyDown={handleKeyDown}
          onfilterchange={handleFilterchange}
        >
          <For each={options()}>{({ id, name }) => <Option value={id}>{name}</Option>}</For>
        </Select>
      </div>

      <div class="form-field">
        <label for="timeout">Timeout</label>
        <input id="timeout" name="timeout" type="number" placeholder={String(defaultTimeout)} />
      </div>
    </form>
  );
}

/* ---------------------------------------- Data Fetching Helpers ---------------------------------------- */
type Pokemon = { id: number; name: string };
const cachedPokemon = [] as Pokemon[];

/** Retrieves all of the Pokemon with the specified `name` */
async function fetchPokemon(name: string, options?: { signal?: AbortSignal }): Promise<Pokemon[]> {
  const signal = options?.signal;

  if (!cachedPokemon.length) {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025", { signal });
    const json = (await response.json()) as { results: { name: string; url: string }[] };
    const data = json.results.map((r) => ({ id: Number(r.url.split("/").at(-2)), name: r.name }));
    cachedPokemon.push(...data);
  }

  const timeoutInput = document.forms[0].elements.namedItem("timeout") as HTMLInputElement;
  const { valueAsNumber } = timeoutInput;
  const timeout = Number.isNaN(valueAsNumber) || valueAsNumber <= 0 ? defaultTimeout : valueAsNumber;

  return new Promise((resolve, reject) => {
    signal?.addEventListener("abort", () => {
      const error = new Error(`User aborted the request. Reason: ${signal.reason}`);
      reject(error);
    });

    const matches = cachedPokemon.filter((p) => p.name.toLowerCase().startsWith(name.toLowerCase()));
    setTimeout(resolve, timeout, matches);
  });
}
