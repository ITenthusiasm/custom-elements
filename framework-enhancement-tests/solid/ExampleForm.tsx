/** @jsxImportSource solid-js */
import { For } from "solid-js";
import Select, { Option } from "./Select.jsx";

export default function ExampleForm() {
  const options = ["First", "Second", "Third", "Fourth", "Fifth"];

  return (
    <form>
      <Select name="ranking" filter>
        <For each={options}>
          {(rank, i) => (
            <Option value={i() + 1} bool:selected={i() === 2}>
              {rank}
            </Option>
          )}
        </For>
      </Select>
    </form>
  );
}
