import Select, { Option } from "./Select.jsx";

export default function ExampleForm() {
  const options = ["First", "Second", "Third", "Fourth", "Fifth"];

  return (
    <form>
      <Select name="ranking" filter>
        {options.map((rank, i) => (
          <Option key={rank} value={i + 1} defaultSelected={i === 2}>
            {rank}
          </Option>
        ))}
      </Select>
    </form>
  );
}
