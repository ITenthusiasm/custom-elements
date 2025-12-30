/** The default timeout used for simulating network request latencies. */
export const defaultTimeout = 2000;

export type Pokemon = { id: number; name: string };
const cachedPokemon = [] as Pokemon[];

/** Retrieves all of the Pokemon with the specified `name` */
export async function fetchPokemon(name: string, options?: { signal?: AbortSignal }): Promise<Pokemon[]> {
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
