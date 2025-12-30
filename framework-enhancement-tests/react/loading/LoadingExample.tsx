import { useState, useRef, useCallback } from "react";
import type { ComboboxField } from "@itenthusiasm/custom-elements";
import Select, { Option } from "../Select.jsx";

/** The default timeout used for simulating network request latencies. */
const defaultTimeout = 2000;

export default function LoadingExample() {
  /* -------------------- Manage Async Options -------------------- */
  const [options, setOptions] = useState<Pokemon[]>([]);

  const timeout = useRef<number>(undefined);
  const controller = useRef<AbortController>(undefined);
  const handleFilterchange = useCallback(async (event: React.SyntheticEvent<ComboboxField>): Promise<void> => {
    event.preventDefault();
    controller.current?.abort(); // Cancel the currently-pending request if one exists
    clearTimeout(timeout.current); // Debounce the event handler

    const comboboxField = event.currentTarget;
    comboboxField.setAttribute("data-status", "idle");

    controller.current = new AbortController();
    timeout.current = window.setTimeout(async () => {
      const search = comboboxField.text.data;
      if (!search) {
        comboboxField.setAttribute("data-status", "success");
        return setOptions([]);
      }

      comboboxField.setAttribute("data-status", "pending");
      try {
        const pokemon = await fetchPokemon(search, { signal: controller.current?.signal });
        setOptions(pokemon);
        comboboxField.setAttribute("data-status", "success");
      } catch (_err) {
        // Handle `abort`ed Requests or Request failures here as desired
      }
    }, 1000);
  }, []);

  /** Restores the `combobox` to a proper state on `collapse` */
  const handleToggle = useCallback((event: React.ToggleEvent<ComboboxField>) => {
    if (event.newState !== "closed") return;

    // Cancel any pending operations
    controller.current?.abort();
    clearTimeout(timeout.current);

    // Restore the last user-selected value on `collapse` (or clear it if the user deleted it)
    const comboboxField = event.currentTarget;
    comboboxField.value = comboboxField.getAttribute("data-last-pokemon") ?? "";

    // Force cursor to end if the `combobox` still has focus
    if (!comboboxField.matches(":focus")) return;
    const selection = document.getSelection();
    const { text } = comboboxField;
    selection?.setBaseAndExtent(text, text.length, text, text.length);
  }, []);

  return (
    <form>
      <div className="form-field">
        <label htmlFor="pokemon">Pokemon</label>
        <Select
          id="pokemon"
          name="pokemon"
          filter
          valueis="anyvalue"
          onChange={handleChange}
          onToggle={handleToggle}
          onKeyDown={handleKeyDown}
          onfilterchange={handleFilterchange}
        >
          {options.map(({ id, name }) => (
            <Option key={name} value={id}>
              {name}
            </Option>
          ))}
        </Select>
      </div>

      <div className="form-field">
        <label htmlFor="timeout">Timeout</label>
        <input id="timeout" name="timeout" type="number" placeholder={String(defaultTimeout)} />
      </div>
    </form>
  );
}

/** Tracks the user's most recently-selected value */
function handleChange(event: React.ChangeEvent<ComboboxField>): void {
  const comboboxField = event.currentTarget;
  if (comboboxField.text.data === "") return comboboxField.setAttribute("data-last-pokemon", "");

  const currentOption = comboboxField.getOptionByValue(comboboxField.value as string);
  if (comboboxField.matches(":focus") && currentOption) {
    comboboxField.setAttribute("data-last-pokemon", currentOption.label);
  }
}

/** Blocks the `Enter` key while `option`s are loading */
function handleKeyDown(event: React.KeyboardEvent<ComboboxField>): void {
  const comboboxField = event.currentTarget;
  const status = comboboxField.getAttribute("data-status");
  if (event.key === "Enter" && status !== "success") event.preventDefault();
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
