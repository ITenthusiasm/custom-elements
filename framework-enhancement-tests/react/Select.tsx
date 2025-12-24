import { createContext, useContext, useState, useEffect } from "react";
import type {} from "@itenthusiasm/custom-elements/Combobox/types/react.d.ts";

const SelectContext = createContext(false);
export default function Select({ children, ...rest }: React.ComponentProps<"combobox-field">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SelectContext.Provider value={mounted}>
      {mounted ? (
        <select-enhancer>
          <combobox-field {...rest}></combobox-field>
          <combobox-listbox>{children}</combobox-listbox>
        </select-enhancer>
      ) : (
        <select {...(rest as React.ComponentProps<"select">)}>{children}</select>
      )}
    </SelectContext.Provider>
  );
}

export function Option({ defaultSelected, ...rest }: React.ComponentProps<"combobox-option">) {
  const mounted = useContext(SelectContext);

  if (!mounted) return <option {...(rest as React.ComponentProps<"option">)} selected={defaultSelected} />;
  return <combobox-option {...rest} defaultSelected={defaultSelected} />;
}
