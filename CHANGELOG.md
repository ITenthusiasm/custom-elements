# Changelog

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
