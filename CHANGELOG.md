# Changelog

## 1.2.0

### Features

- Introduce a new `PseudoBackdrop` Web Component used to elevate 1-2 elements above a backdrop _at the same time_. Be warned that this is a component designed for use cases for the team's _internal_ applications, so it _will_ have rough edges. Nonetheless, we've provided some [documentation](./src/PseudoBackdrop/README.md) to explain how it can be used. ([1029821](https://github.com/ITenthusiasm/custom-elements/commit/1029821c01ba5e9286094f7ba39e39c2e48f9153))
- Dispatch a `toggle` event whenever the `MenuElement` is opened/closed. ([3e0f04f](https://github.com/ITenthusiasm/custom-elements/commit/3e0f04fae41ffefcfef54ac6b240eeed79fea30b))

### Bug Fixes

- Correct the `Combobox` component's logic for clearing its `Selection` on `blur`. ([83d2107](https://github.com/ITenthusiasm/custom-elements/commit/83d2107a58ad74b26692dabe08bb1e4127695f12))
- Keep the `Combobox` component expanded when focus shifts to its `listbox`. ([b7b7e98](https://github.com/ITenthusiasm/custom-elements/commit/b7b7e98e7a5afa18e2da26d30a9ea957dcbfa7dc))
- Keep the `Combobox` component expanded when the user switches to a different tab/page. ([b7b7e98](https://github.com/ITenthusiasm/custom-elements/commit/b7b7e98e7a5afa18e2da26d30a9ea957dcbfa7dc))
- Keep the `MenuElement` expanded when the user switches to a different tab/page. ([b7b7e98](https://github.com/ITenthusiasm/custom-elements/commit/b7b7e98e7a5afa18e2da26d30a9ea957dcbfa7dc))
- In React Type Definitions, expose `toggle` event handlers as `ontoggle` rather than relying strictly on React's `onToggle` prop. ([f2ad212](https://github.com/ITenthusiasm/custom-elements/commit/f2ad21269c5fa226dfd9b5213a2e95258eaa99f2))
  - For some reason, some versions of React _do not_ support `onToggle` on Web Components and instead require `ontoggle`. This is likely a design flaw in React. Nonetheless, you can now use `ontoggle` if you run into this problem.
  - Related Components: `ComboboxField` and `MenuElement`.

## 1.1.0

### Changes

- Introduce a new `MenuElement` Web Component for creating compliant [ARIA `menu`s](https://w3c.github.io/aria/#menu). (Initial featureset is minimalistic.) See our [documentation](./src/MenuElement/README.md) to learn more about the component. ([f721077](https://github.com/ITenthusiasm/custom-elements/commit/f7210771cab6d54811a773a27988892d5c11ef9a))

## 1.0.3

### Changes

- Skip `attributeChangedCallback` if no `<fieldset>` exists ([db1aadd](https://github.com/ITenthusiasm/custom-elements/commit/db1aadd0753d0bf5eeaef9fb72916e563296667f))
  - This helps React in scenarios where it creates the `<checkbox-group>` and alters one of its observed attributes _before_ attaching the mandatory `<fieldset>` to it.

## 1.0.2

### Bug Fixes

- When an `option` belonging to an `anyvalue` `combobox` is _programmatically_ deselected, cause the `combobox`'s value to correctly fallback to its text content. ([0b0a3cf](https://github.com/ITenthusiasm/custom-elements/commit/0b0a3cffc07e007feb35ecc64bb6a07b88a094e4))
- When an Empty Value Option is selected for a `clearable`/`anyvalue` `combobox` whose value and text content are _both_ an empty string (`""`), ensure that the `combobox`'s text content is still updated to match the newly-selected option. ([0b0a3cf](https://github.com/ITenthusiasm/custom-elements/commit/0b0a3cffc07e007feb35ecc64bb6a07b88a094e4))

## 1.0.1

### Bug Fixes

- Don't remove `Node`s (such as [`Comment`s](https://developer.mozilla.org/en-US/docs/Web/API/Comment)) from the `ComboboxListbox` that JS Frameworks like Svelte use to help with reconciliation. ([1984672](https://github.com/ITenthusiasm/custom-elements/commit/19846728678eda77156f326420e52b1b4d106f82))

## 1.0.0

Initial stable release for the `Combobox` and `CheckboxGroup` Web Components / Custom Elements. See the [documentation](./src/README.md) to learn how these components work.
