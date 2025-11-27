# The `ComboboxOption` Element

The `ComboboxOption` is a [Custom Element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) used by the [`Combobox` component](.)[^1]. When a user selects a `ComboboxOption` (using a mouse, a keyboard, a screen reader, or something else), the value of the associated [`<combobox-field>`](./combobox-field.md) is updated to match the selected option, and the `<combobox-field>`'s text content is updated to display the selected option's label.

The `ComboboxOption`'s accessible role is [`option`](https://www.w3.org/TR/wai-aria-1.2/#option). As such, this Custom Element must always be placed within a [`<combobox-listbox>`](./combobox-listbox.md).

[^1]: Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible `combobox` [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of custom elements](.#component-structure) in our library which together form one component that functions as an accessible `combobox` for users.

## Attributes

As a Custom Element, the `ComboboxOption` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `ComboboxOption` are analogous to the unique attributes belonging to an [`HTMLOptionElement`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/option#attributes), excluding the superfluous `label` attribute. The attributes are as follows:

<dl>
  <dt id="attributes-id">
    <a href="#attributes-id"><code>id</code></a>
  </dt>
  <dd>
    <p>
      Same as the regular <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id"><code>id</code></a> attribute which exists on every <code>HTMLElement</code>. However, <strong>modifying this attribute is forbidden</strong>. For accessibility purposes, its value is controlled by the <a href="./combobox-field.md"><code>ComboboxField</code></a> associated with the <code>ComboboxOption</code>, and it always follows the pattern <code>{ComboboxField.id}-option-{ComboboxOption.value}</code>.
    </p>
    <p>
      This attribute is reflected by the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/id"><code>Element.id</code></a> property which exists on all <code>HTMLElement</code>s. This value can be read, but it should never be modified by the developer.
    </p>
  </dd>
  <dt id="attributes-value">
    <a href="#attributes-value"><code>value</code></a>
  </dt>
  <dd>
    <p>
      Determines the value of the <code>ComboboxOption</code>. When an option is selected, its value is assigned to the associated <a href="./combobox-field.md#properties-value"><code>ComboboxField.value</code></a>. If an option doesn't have a <code>value</code> attribute, then its text content is used as its value instead.
    </p>
    <p>Note: Because of how option <a href="#attributes-id">IDs</a> are generated, each option in a <code>Combobox</code> component must have a unique value.</p>
    <p>This attribute is reflected by the <a href="#properties-value"><code>ComboboxOption.value</code></a> property.</p>
  </dd>

  <dt id="attributes-selected">
    <a href="#attributes-selected"><code>selected</code></a>
  </dt>
  <dd>
    <p>
      Determines the <code>ComboboxOption</code> which will be selected by default (e.g., when the page first loads or when the <code>Combobox</code> component is first connected to the DOM). Only one option in a list is allowed to have this attribute.
    </p>
    <p>This boolean attribute is reflected by the <a href="#properties-defaultSelected"><code>ComboboxOption.defaultSelected</code></a> property.</p>
  </dd>

  <dt id="attributes-aria-disabled">
    <a href="#attributes-aria-disabled"><code>aria-disabled</code></a>
  </dt>
  <dd>
    <p>
      Same as the regular <a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled"><code>aria-disabled</code></a> attribute which exists on every <code>HTMLElement</code>. When set to the string <code>"true"</code>, users will not be able to select the option. However, the option can still be selected programmatically by the developer. It is recommended to distinguish disabled options from selectable options using <a href="https://www.w3schools.com/cssref/sel_attribute_value.php"><code>CSS</code></a>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-disabled"><code>ComboboxOption.disabled</code></a> property. It is also reflected by the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaDisabled"><code>Element.ariaDisabled</code></a> property, which exists on all <code>HTMLElements</code>.</p>
  </dd>
</dl>

## Properties

As a Custom Element, the `ComboboxOption` inherits all of the methods and properties of [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `ComboboxOption` are analogous to the unique properties belonging to an [`HTMLOptionElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement). However, the superfluous `text` property has been omitted, and the `label` property is readonly. The properties are listed below.

> Note: Any items labeled `advanced` are only intended for handling special, **_uncommon_** use cases; you **_don't_** need to learn about them. However, you might find them useful for edge cases, like enhancing performance when you have an extremely large list of options.

<dl>
  <dt id="properties-label">
    <a href="#properties-label"><code>label</code></a>
  </dt>
  <dd>
    A readonly property of type <code>string</code> which returns the text content of the <code>ComboboxOption</code>. When an option is selected, the textual display of the associated <a href="./combobox-field.md"><code>ComboboxField</code></a> is updated to match the <code>label</code> of the selected option.
  </dd>

  <dt id="properties-value">
    <a href="#properties-value"><code>value</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-value"><code>value</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-selected">
    <a href="#properties-selected"><code>selected</code></a>
  </dt>
  <dd>
    <p>
      A <code>boolean</code> property which indicates whether or not an option is currently selected. Only one option may be selected at a time.
    </p>
    <p>
      <strong>When an <em>unselected</em> option is marked selected:</strong> 1&rpar; The value of the associated <code>ComboboxField</code> is updated to match the selected option, 2&rpar; The <code>ComboboxField</code>'s text content is updated to display the selected option's label, and 3&rpar; The previously-selected option (if one exists) is marked as unselected.
    </p>
    <p>
      <strong>When a <em>selected</em> option is deselected:</strong> The logic that runs depends on the <a href="./combobox-field.md#attributes-valueis"><code>valueis</code></a> attribute of the associated <code>ComboboxField</code>:
    </p>
    <ul>
      <li><code>anyvalue</code>: The text content of the <code>ComboboxField</code> becomes its value.</li>
      <li><code>clearable</code>: The text content of the <code>ComboboxField</code> is cleared, and its value becomes an empty string (<code>""</code>).</li>
      <li><code>unclearable</code>: Because <code>unclearable</code> mode requires an option to be selected, the default option will be marked selected, updating the state of the associated <code>ComboboxField</code> in the process.</li>
    </ul>
    <p>Note: This deselection logic <em>does not run</em> if an option becomes deselected in response to another option becoming selected.</p>
  </dd>

  <dt id="properties-defaultSelected">
    <a href="#properties-defaultSelected"><code>defaultSelected</code></a>
  </dt>
  <dd>A <code>boolean</code> property which reflects the value of the <a href="#attributes-selected"><code>selected</code></a> attribute.</dd>

  <dt id="properties-disabled">
    <a href="#properties-disabled"><code>disabled</code></a>
  </dt>
  <dd>
    A <code>boolean</code> property which reflects the value of the <a href="#attributes-aria-disabled"><code>aria-disabled</code></a> attribute. You can consider it an alias for the global <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaDisabled"><code>Element.ariaDisabled</code></a> property, except that it uses a more-ergonomic <code>boolean</code> instead of an enumerated <code>string</code>.
  </dd>

  <dt id="properties-index">
    <a href="#properties-index"><code>index</code></a>
  </dt>
  <dd>
    <p>
      Retrieves the position of the option within the list of options as a 0-based index. If an option does not belong to a <code>Combobox</code> component, its <code>index</code> is always 0.
    </p>
    <p>
      Note that an option's index is computed every time this property is accessed. Therefore, if you have a very large list of options, you should limit the number of times you read from this property.
    </p>
  </dd>

  <dt id="properties-form">
    <a href="#properties-form"><code>form</code></a>
  </dt>
  <dd>The <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement"><code>HTMLFormElement</code></a> with which the <code>Combobox</code> component is associated, or <code>null</code> if there is no associated form.</dd>

  <dt id="properties-filteredOut">
    <a href="#properties-filteredOut"><code>filteredOut</code></a> (advanced)
  </dt>
  <dd>
    <p>
      A <code>boolean</code> property indicating whether or not an option is currently filtered out by the user. Only relevant when the associated <code>ComboboxField</code> is in <a href="./combobox-field.md#attributes-filter">Filter Mode</a>.
    </p>
    <p>
      <strong>NOTE: You should <em>never</em> update this property.</strong> And there should be no circumstances in which you need to read from it either. This property is an accessor which exists <em>solely</em> so that it can be overriden for fine-tuning the component's performance. <strong>Most developers will will not need it.</strong> For more details on performance tuning, see our <a href="./guides">guides</a>.
    </p>
  </dd>
</dl>

## Determining The Default Option

A `Combobox` component's default option is the option which will be selected by default when:

- The page first loads (or the component is connected to the DOM)
- The component's owning form is [reset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reset).

Typically, the option with the [`selected`](#attributes-selected) attribute is considered the default option. However, it's possible that a developer may not want to specify a default option at all. In that case, the default option is determined based on the [`valueis`](./combobox-field.md#attributes-valueis) attribute of the associated `ComboboxField`:

<table>
  <thead>
    <tr>
      <th scope="col"><code>valueis</code></th>
      <th scope="col">Default Option (when <code>selected</code> attribute is omitted)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>unclearable</code></td>
      <td>The first option in the list of options</td> 
    </tr>
    <tr>
      <td><code>clearable</code></td>
      <td>None</td>
    </tr>
    <tr>
      <td><code>anyvalue</code></td>
      <td>None</td>
    </tr>
  </tbody>
</table>

If no option is given a `selected` attribute, the following behaviors are observed:

<table>
  <caption><strong>Component Behavior When the <code>selected</code> Attribute Is Omitted</strong></caption>
  <thead>
    <tr>
      <th scope="col"><code>valueis</code></th>
      <th scope="col">Component is mounted</th>
      <th scope="col">Component's form is reset</th>
      <th scope="col">The selected option is deselected</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>unclearable</code></td>
      <td>The first option is selected by default.</td>
      <td>The first option is selected by default.</td>
      <td>The first option is selected by default.</td>
    </tr>
    <tr>
      <td><code>clearable</code></td>
      <td>No option is selected by default. The <code>ComboboxField</code>'s value and text content are set to an empty string.</td>
      <td>All options are marked as unselected. The <code>ComboboxField</code>'s value and text content are set to an empty string.</td>
      <td>The <code>ComboboxField</code>'s value and text content are set to an empty string.</td>
    </tr>
    <tr>
      <td><code>anyvalue</code></td>
      <td>No option is selected by default. The <code>ComboboxField</code>'s value and text content are set to an empty string.</td>
      <td>All options are marked as unselected. The <code>ComboboxField</code>'s value and text content are set to an empty string.</td>
      <td>The <code>ComboboxField</code>'s value is set to its text content.</td>
    </tr>
  </tbody>
</table>

Note that the component's behavior in `unclearable` mode is consistent with the native [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element's behavior.

## What's Next?

- Get a [high-level](.) view of how the `Combobox` component works. Or, dive deeper into the component's other segments:
  - [`<select-enhancer>`](./select-enhancer.md)
  - [`<combobox-field>`](./combobox-field.md)
  - [`<combobox-listbox>`](./combobox-listbox.md)
- Read our [guides](./guides) to learn more about what you can accomplish with our component.
