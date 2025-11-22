# The `ComboboxField` Element

The `ComboboxField` is a [Custom Element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) used by the [`Combobox` component](.)[^1]. Besides the [`SelectEnhancer`](./select-enhancer.md) (which glues all of the `Combobox` component pieces together), it is perhaps the most important part of the `Combobox` component. It hides and reveals the options, manages the form and validity states of the component, implements the component's filtering logic, and more. Its accessible role is [`combobox`](https://www.w3.org/TR/wai-aria-1.2/#combobox).

[^1]: Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of components](.#component-structure) used by our library to provide an accessible `combobox` to users.

## Attributes

As a Custom Element, the `ComboboxField` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `ComboboxField` are as follows:

<dl>
  <dt id="attributes-id">
    <a href="#attributes-id"><code>id</code></a>
  </dt>
  <dd>
    <p>
      Same as the regular <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id"><code>id</code></a> attribute which exists on every <code>HTMLElement</code>. When its ID is changed, the <code>ComboboxField</code> updates the ID of its <a href="./combobox-listbox.md"><code>ComboboxListbox</code></a> to <code>{ComboboxField.id}-listbox</code>, and the IDs of all the associated <a href="./combobox-option.md"><code>ComboboxOption</code>s</a> are updated to <code>{ComboboxField.id}-option-{ComboboxOption.value}</code>. These IDs are needed for accessibility purposes. (This is the reason that <a href="./combobox-option.md#TODO">option's must have unique values</a>.) <!-- NOTE: We might want to link back to this attribute from the linked documentation section. -->
    </p>
    <p>
      If the <code>ComboboxField</code> does not have an ID when the page is first loaded (or when the entire <code>Combobox</code> component is first connected to the DOM), then the <a href="./select-enhancer.md"><code>SelectEnhancer</code></a> generates a unique one for it. Afterwards, the IDs of the <code>ComboboxListbox</code> and the <code>ComboboxOption</code>s will be synchronized as needed.
    </p>
    <p>
      This attribute is reflected by the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/id"><code>Element.id</code></a> property which exists on all <code>HTMLElement</code>s.
    </p>
  </dd>

  <dt id="attributes-filter">
    <a href="#attributes-filter"><code>filter</code></a>
  </dt>
  <dd>
    <p>A boolean attribute that enables Filter Mode.</p>
    <p>
      When this attribute is omitted, the <code>ComboboxField</code> is in Regular Mode. In this mode, the element behaves like a regular <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select"><code>&lt;select&gt;</code></a> element.
    </p>
    <p>
      When this attribute is present, the <code>ComboboxField</code> is in Filter Mode, effectively making it an enhanced version of the <code>&lt;select&gt;</code> element. In this mode, the <code>ComboboxField</code> becomes an editable textbox that can be used to filter through the list of options. If you have a longer list of options, this mode helps users find and select what they're looking for more quickly. You can further customize the element's behavior in Filter Mode with the <a href="#attributes-filtermethod"><code>filtermethod</code></a> and <a href="#attributes-valueis"><code>valueis</code></a> attributes.
    </p>
    <p>This attribute is reflected by the <a href="#properties-filter"><code>ComboboxField.filter</code></a> property.</p>
  </dd>

  <dt id="attributes-filtermethod">
    <a href="#attributes-filtermethod"><code>filtermethod</code></a>
  </dt>
  <dd>
    <p>An enumerated attribute which determines how options will be filtered. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) Allowed Values:</p>
    <ul>
      <li><code>startsWith</code> (Default): Options will be compared against the user's filter using the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith"><code>String.startsWith()</code></a> method.</li>
      <li><code>includes</code>: Options will be compared against the user's filter using the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes"><code>String.includes()</code></a> method.</li>
    </ul>
    <p>
      If necessary, the element's filtering logic can be customized even further by overriding the <a href="#methods-optionMatchesFilter"><code>optionMatchesFilter</code></a> method. Note that overriding this method will render the <code>filtermethod</code> attribute useless (unless you use the attribute in your method override).
    </p>
    <p>This attribute is reflected by the <a href="#properties-filterMethod"><code>ComboboxField.filterMethod</code></a> property.</p>
  </dd>
  
  <dt id="attributes-valueis">
    <a href="#attributes-valueis"><code>valueis</code></a>
  </dt>
  <dd>
    <p>
      An enumerated attribute which determines the kinds of values that the component will accept. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) This attribute (together with the <code>filter</code> attribute) has the largest impact on how the component behaves. Allowed values:
    </p>
    <ul>
      <li>
        <code>anyvalue</code>: The <a href="#properties-value"><code>ComboboxField.value</code></a> can be set to any string. For this reason, whatever the user types into the searchbox becomes the element's value. Note that when a user change's the element's value by typing into the searchbox, the currently-selected option is deselected (because the user's new filter/input is not guaranteed to have a corresponding option). However, users can still explicitly select a matching option. If you prefer to auto-select options for your users as they type, use the <a href="#properties-autoselectableOption"><code>ComboboxField.autoselectableOption</code></a> property in an <a href="#events-input"><code>input</code></a> or <a href="#events-filterchange"><code>filterchange</code></a> event listener.
      </li>
      <li>
        <code>unclearable</code>: The <code>ComboboxField.value</code> can <strong>only</strong> be set to a string that matches the value of one of the component's <a href="./combobox-option.md"><code>ComboboxOption</code>s</a>. For this reason, nothing that the user types into the searchbox is excepted as a value. Rather, if the user wants to update the element's value, they must do so by explicitly selecting an option. If the user changes the filter, but later leaves (or closes) the searchbox without selecting an option, the <code>ComboboxField</code>'s text content will be reverted to the label of the currently-selected option.
      </li>
      <li>
        <code>clearable</code> (Default): Similar to <code>unclearable</code>, except that the <code>ComboboxField.value</code> can always be cleared. This happens when the property is set to an empty string, or when the user deletes all of the searchbox's content. Note that when the element's value is cleared, the currently-selected option will be deselected.
      </li>
    </ul>
    <!-- TODO: Should we document behavior when all options are removed? This might hold significance for people trying to load options async (if going [un]clearable). -->
    <!-- TODO: We need to document the nuance of setting `clearable` comboboxes to an empty string when an "Empty String Option" exists (vs. `forceEmptyValue()`) -->
    <!-- TODO: We'll want to avoid splitting up docs on `valueis`'s behavior too much. Otherwise, devs will have to go everywhere to understand the component. -->
    <!-- TODO: Should we mention that this component also affects the default option / form resets? And/Or just link to Option docs? -->
    <p>
      This attribute is ignored if the <code>ComboboxField</code> is not in Filter Mode. However, as far as assignment to the <code>ComboboxField.value</code> goes, the element <em>behaves</em> as if it is <code>unclearable</code> when it's not in Filter Mode.
    </p>
    <p>This attribute is reflected by the <a href="#properties-valueIs"><code>ComboboxField.valueIs</code></a> property.</p>
  </dd>

  <dt id="attributes-nomatchesmessage">
    <a href="#attributes-nomatchesmessage"><code>nomatchesmessage</code></a>
  </dt>
  <dd>
    <p>
      Determines the message that will be displayed to users when they provide a filter that doesn't have any matching options. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) To learn more about how to customize the display of the "No Matches Message", see our <a href="./guides">guides</a>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-noMatchesMessage"><code>ComboboxField.noMatchesMessage</code></a> property.</p>
  </dd>

  <dt id="attributes-valuemissingerror">
    <a href="#attributes-valuemissingerror"><code>valuemissingerror</code></a>
  </dt>
  <dd>
    <p>
      Determines the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>validationMessage</code></a> that the element will display if it has a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/valueMissing"><code>ValidityState.valueMissing</code></a> error. (This error state occurs when the element has the <a href="#attributes-required"><code>required</code></a> attribute and its value is an empty string.) If the component's owning form is submitted with an erroneous <code>ComboboxField</code>, form submission will fail, and the <code>valuemissingerror</code> will be shown to the user in an error message bubble.
    </p>
    <p>
      To learn more about client-side form validation, see MDN's <a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation">Client-side Form Validation</a> guide. If you're looking for a robust form validation library that works with Web Components, try the <a href="https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer"><code>FormValidityObserver</code></a>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-valueMissingError"><code>ComboboxField.valueMissingError</code></a> property.</p>
  </dd>

  <dt id="attributes-required">
    <a href="#attributes-required"><code>required</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/required"><code>required</code></a> boolean attribute seen on native form controls like the <code>&lt;select&gt;</code> element. Indicates that the element's owning form cannot be submitted if its value is an empty string (e.g., if a valid option has not yet been selected).
    </p>
    <p>This attribute is reflected by the <a href="#properties-required"><code>ComboboxField.required</code></a> property.</p>
  </dd>
  
  <dt id="attributes-name">
    <a href="#attributes-name"><code>name</code></a>
  </dt>
  <dd>
    <p>
      Same as the <code>name</code> attribute seen on native form controls (e.g., <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#name"><code>&lt;input&gt;</code></a>). Ensures the element's value will be submitted to the server under the specified <code>name</code>. This name can also be used to access the element via the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements"><code>HTMLFormElement.elements</code></a> property of the owning form.
    </p>
    <p>This attribute is reflected by the <a href="#properties-name"><code>ComboboxField.name</code></a> property.</p>
  </dd>

  <dt id="attributes-disabled">
    <a href="#attributes-disabled"><code>disabled</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled"><code>disabled</code></a> boolean attribute seen on native form controls like the <code>&lt;select&gt;</code> element. When this attribute is present, the entire component will become non-interactive, and its value will not be sent to the server.
    </p>
    <p>This attribute is reflected by the <a href="#properties-disabled"><code>ComboboxField.disabled</code></a> property.</p>
  </dd>
</dl>

## Properties

As a Custom Element, the `ComboboxField` inherits all of the methods and properties of [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `ComboboxField` are as follows:

<dl>
  <dt id="properties-value">
    <a href="#properties-value"><code>value</code></a>
  </dt>
  <dd>
    <p>
      Sets or retrieves the value of the component. The property is of type <code>string | null</code>. (The property will only return <code>null</code> if the component has no options and is in <code>unclearable</code> or <code>clearable</code> mode. It cannot be set to <code>null</code> by the developer.) The values that can be assigned to this property depend on the element's <a href="#attributes-valueis"><code>valueis</code></a> attribute.
    </p>
    <p>
      When the element's value is set successfully, the <code>ComboboxOption</code> with the corresponding value (if it exists) will be marked selected. Similarly, whenever a new option is selected, the element's value will be updated to match that option's value. If the element's new value has a corresponding option when it is changed, then the element's text content will be set to the matching option's label. Otherwise, the element's text content will be set to the supplied value string.
    </p>
    <blockquote>
      <p>
        Note: If the <code>ComboboxField.value</code> is changed to a string that matches one of its options, it will always set its text content to that option's label. This happens even for Empty Value Options (e.g., <code>&lt;combobox-option value=""&gt;Pick an Option&lt;/combobox-option&gt;</code>), regardless of whether or not your <code>ComboboxField</code> is in <code>clearable</code> or <code>anyvalue</code> mode.
      </p>
      <p>
        Consequently, a <code>clearable</code>/<code>anyvalue</code> <code>ComboboxField</code> with an Empty Value Option will not have its text content cleared when its value is set to an empty string. In that scenario, if you want to clear <em>both</em> the element's value <em>and</em> its text content, then you must call the <a href="#methods-forceEmptyValue"><code>ComboboxField.forceEmptyValue()</code></a> method instead.
      </p>
    </blockquote> 
  </dd>

  <dt id="properties-filter">
    <a href="#properties-filter"><code>filter</code></a>
  </dt>
  <dd>A <code>boolean</code> property which reflects the value of the <a href="#attributes-filter"><code>filter</code></a> attribute.</dd>

  <dt id="properties-filterMethod">
    <a href="#properties-filterMethod"><code>filterMethod</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-filtermethod"><code>filtermethod</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-valueIs">
    <a href="#properties-valueIs"><code>valueIs</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-valueis"><code>valueis</code></a> attribute. Type is <code>"unclearable" | "clearable" | "anyvalue"</code>.</dd>

  <dt id="properties-autoselectableOption">
    <a href="#properties-autoselectableOption"><code>autoselectableOption</code></a>
  </dt>
  <dd>
    <p>
      A read-only property which returns the option whose <code>label</code> matches the user's most recent filter input. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) Type is <code>ComboboxOption | null</code>. This property is useful if you want to automatically select options for your users as they type. For example, in a <a href="#events-filterchange"><code>filterchange</code></a> event listener, you could check for an <code>autoselectableOption</code> and select it if it exists. Note that the user's filter must <em>exactly</em> match an option's label (including casing) for an <code>autoselectableOption</code> to exist. match must be <em>exact</em>, including casing.
    </p>
    <p>This property will become <code>null</code> in any of the following scenarios:</p>
    <ul>
      <li>The user's most recent filter didn't match an of the options.</li>
      <li>The <code>ComboboxField</code>'s text content was altered because of a change to its <code>value</code>.</li>
      <li>The <code>ComboboxField</code> was expanded and the user has not yet applied a filter.</li>
    </ul>
    <p>
      Note that this property persists when the <code>ComboboxField</code> is <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event">blurred</a>. Thus, if you prefer to auto-select options when the user leaves the searchbox, that is fine as well.
    </p>
  </dd>

  <dt id="properties-noMatchesMessage">
    <a href="#properties-noMatchesMessage"><code>noMatchesMessage</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-nomatchesmessage"><code>nomatchesmessage</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-valueMissingError">
    <a href="#properties-valueMissingError"><code>valueMissingError</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-valuemissingerror"><code>valuemissingerror</code></a> attribute. Type is <code>string</code>.</dd>
</dl>

# Methods

# Events

<!-- TODO: We should probably specify emitted events somewhere as well. -->
<!-- TODO: Guides should document i18n -->
