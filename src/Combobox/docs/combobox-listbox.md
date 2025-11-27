# The `ComboboxListbox` Element

The `ComboboxListbox` is a [Custom Element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) used by the [`Combobox` component](.)[^1]. Its sole purpose is to serve as an accessible [`listbox`](https://www.w3.org/TR/wai-aria-1.2/#listbox) which wraps the [`<combobox-option>`s](./combobox-option.md). This is necessary to satisfy the accessibility requirements of [`combobox`es](https://www.w3.org/TR/wai-aria-1.2/#combobox). Besides this, the `ComboboxListbox` provides an easy way to iterate over the component's `option`s programmatically.

[^1]: Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible `combobox` [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of custom elements](.#component-structure) in our library which together form one component that functions as an accessible `combobox` for users.

## Attributes

As a Custom Element, the `ComboboxListbox` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The following attributes are special to the `ComboboxListbox`:

<dl>
  <dt id="attributes-id">
    <a href="#attributes-id"><code>id</code></a>
  </dt>
  <dd>
    <p>
      Same as the regular <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id"><code>id</code></a> attribute which exists on every <code>HTMLElement</code>. However, <strong>modifying this attribute is forbidden</strong>. For accessibility purposes, its value is controlled by the <a href="./combobox-field.md"><code>ComboboxField</code></a> associated with the <code>ComboboxListbox</code>, and it always follows the pattern <code>{ComboboxField.id}-listbox</code>.
    </p>
    <p>
      This attribute is reflected by the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/id"><code>Element.id</code></a> property which exists on all <code>HTMLElement</code>s. This value can be read, but it should never be modified by the developer.
    </p>
  </dd>

  <dt id="attributes-nomatchesmessage">
    <a href="#attributes-nomatchesmessage"><code>nomatchesmessage</code></a>
  </dt>
  <dd>
    <p>
      Every <a href="./combobox-field.md"><code>ComboboxField</code></a> has a <a href="./combobox-field.md#attributes-nomatchesmessage"><code>nomatchesmessage</code></a> attribute which functions as an <em>optional</em> way to control the component's No Matches Message in <a href="./combobox-field.md#attributes-filter">Filter Mode</a>. The <code>nomatchesmessage</code> attribute on the <code>ComboboxListbox</code> is simply a reflection of the attribute on the owning <code>ComboboxField</code>. It only exists as a way to help with styling the No Matches Message. (There are other ways to style this message, as laid out in our <a href="./guides">guides</a>.)
    </p>
    <p>This attribute <strong>is not</strong> reflected by a JS property.</p>
  </dd>
</dl>

## Properties

As a Custom Element, the `ComboboxListbox` inherits all of the methods/properties of [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. It has no special properties of its own.

## What's Next?

- Get a [high-level](.) view of how the `Combobox` component works. Or, dive deeper into the component's other segments:
  - [`<select-enhancer>`](./select-enhancer.md)
  - [`<combobox-field>`](./combobox-field.md)
  - [`<combobox-option>`](./combobox-option.md)
- Read our [guides](./guides) to learn more about what you can accomplish with our component.
