# The `ComboboxField` Element

The `ComboboxField` is a [Custom Element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) used by the [`Combobox` component](.)[^1]. Besides the [`SelectEnhancer`](./select-enhancer.md) (which glues all of the `Combobox` component's pieces together), it is perhaps the most important part of the `Combobox` component. It hides/reveals the options, manages the form and validity states of the component, implements the component's filtering logic, and more. Its accessible role is [`combobox`](https://www.w3.org/TR/wai-aria-1.2/#combobox).

[^1]: Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible `combobox` [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of custom elements](.#component-structure) in our library which together form one component that functions as an accessible `combobox` for users.

## Attributes

As a Custom Element, the `ComboboxField` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `ComboboxField` are as follows:

<dl>
  <dt id="attributes-id">
    <a href="#attributes-id"><code>id</code></a>
  </dt>
  <dd>
    <p>
      Same as the regular <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id"><code>id</code></a> attribute which exists on every <code>HTMLElement</code>. When the <code>ComboboxField</code>'s ID is changed, the ID of its <a href="./combobox-listbox.md"><code>ComboboxListbox</code></a> is updated to <code>{ComboboxField.id}-listbox</code>, and the IDs of all associated <a href="./combobox-option.md"><code>ComboboxOption</code>s</a> are updated to <code>{ComboboxField.id}-option-{ComboboxOption.value}</code>. These IDs are needed for accessibility purposes. (For this reason, each option within a given listbox must have a unique value.)
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
      When this attribute is omitted, the <code>ComboboxField</code> is in Regular Mode. In this mode, the entire <code>Combobox</code> component behaves similarly to a regular <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select"><code>&lt;select&gt;</code></a> element. (That is, options can be selected, but not filtered.)
    </p>
    <p>
      When this attribute is present, the <code>ComboboxField</code> is in Filter Mode. In this mode, the <code>ComboboxField</code> becomes an editable textbox that can be used to filter through the list of options, effectively making the entire <code>Combobox</code> component an enhanced version of the <code>&lt;select&gt;</code> element. If you have a longer list of options, this mode helps users find and select what they're looking for more quickly. You can further customize the element's behavior in Filter Mode with the <a href="#attributes-filtermethod"><code>filtermethod</code></a> and <a href="#attributes-valueis"><code>valueis</code></a> attributes.
    </p>
    <p>This attribute is reflected by the <a href="#properties-filter"><code>ComboboxField.filter</code></a> property.</p>
  </dd>

  <dt id="attributes-filtermethod">
    <a href="#attributes-filtermethod"><code>filtermethod</code></a>
  </dt>
  <dd>
    <p>An enumerated attribute which determines how options will be filtered. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) Allowed Values:</p>
    <dl>
      <dt><code>startsWith</code> (Default)</dt>
      <dd>
        Options will be compared against the user's filter using the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith"><code>String.startsWith()</code></a> method (recommended).
      </dd>
      <dt><code>includes</code></dt>
      <dd>
        Options will be compared against the user's filter using the <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes"><code>String.includes()</code></a> method.
      </dd>
    </dl>
    <p>
      If necessary, the element's filtering logic can be customized even further by overriding the <a href="#methods-optionMatchesFilter"><code>ComboboxField.optionMatchesFilter()</code></a> method. Note that overriding this method will render the <code>filtermethod</code> attribute useless (unless you use the attribute in your method override).
    </p>
    <p>This attribute is reflected by the <a href="#properties-filterMethod"><code>ComboboxField.filterMethod</code></a> property.</p>
  </dd>
  
  <dt id="attributes-valueis">
    <a href="#attributes-valueis"><code>valueis</code></a>
  </dt>
  <dd>
    <p>
      An enumerated attribute which determines the kinds of values that the component will accept. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) This attribute (together with the <code>filter</code> attribute) has the largest impact the <code>Combobox</code> component's behavior. Allowed values:
    </p>
    <dl>
      <dt><code>anyvalue</code></dt>
      <dd>
        <p>
          The <a href="#properties-value"><code>ComboboxField.value</code></a> can be set to any string, even if there is no matching option. For this reason, whatever the user types into the searchbox becomes the element's value.
        </p>
        <p>
          Note that when a user changes the element's value by typing into the searchbox, the currently-selected option is deselected (because the user's new filter/input is not guaranteed to have a corresponding option). However, users can still select matching options explicitly. If you prefer to auto-select options for your users as they type, use the <a href="#properties-autoselectableOption"><code>ComboboxField.autoselectableOption</code></a> property in an <a href="#events-input"><code>input</code></a> or <a href="#events-filterchange"><code>filterchange</code></a> event listener.
        </p>
      </dd>
      <dt><code>unclearable</code></dt>
      <dd>
        <p>
          The <code>ComboboxField.value</code> can <strong>only</strong> be set to a string which matches the value of one of the component's <a href="./combobox-option.md"><code>ComboboxOption</code>s</a>. For this reason, users won't be able to update the element's value by typing into it or by clearing its text content. Rather, if the user wants to update the element's value (or set the value to an empty string), they must do so by explicitly selecting an option.
        </p>
        <p>
          If the user changes the filter, but later leaves (or closes) the searchbox without selecting an option, then the <code>ComboboxField</code>'s text content will be reverted to the label of the currently-selected option.
        </p>
      </dd>
      <dt><code>clearable</code> (Default)</dt>
      <dd>
        Similar to <code>unclearable</code>, except that the <code>ComboboxField.value</code> can always be set to an empty string, even if there is no option with an empty string value. The element's value will become an empty string when 1&rpar; The property is set to an empty string, 2&rpar; The user deletes all of the searchbox's text content, or 3&rpar; <a href="#methods-forceEmptyValue"><code>ComboboxField.forceEmptyValue()</code></a> is called. Keep in mind that clearing the element's value will also deselect the currently-selected option.
      </dd>
    </dl>
    <p>
      In addition to determining the allowed values for the <code>ComboboxField</code>, the <code>valueis</code> attribute determines what the <a href="./combobox-option.md#determining-the-default-option">default option</a> for the <code>Combobox</code> component will be if none is specified by the developer. If the <code>ComboboxField</code> is not in Filter Mode, the entire component behaves as if <code>valueis</code> is <code>unclearable</code> (except that the options won't be filterable).
    </p>
    <p>This attribute is reflected by the <a href="#properties-valueIs"><code>ComboboxField.valueIs</code></a> property.</p>
  </dd>

  <dt id="attributes-nomatchesmessage">
    <a href="#attributes-nomatchesmessage"><code>nomatchesmessage</code></a>
  </dt>
  <dd>
    <p>
      Determines the message that will be displayed to users when they provide a filter that has no matching options. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) To learn more about how to customize the display of the "No Matches Message", see our <a href="./guides/styling-the-combobox.md#styling-the-no-matches-message">guides</a>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-noMatchesMessage"><code>ComboboxField.noMatchesMessage</code></a> property.</p>
  </dd>

  <dt id="attributes-valuemissingerror">
    <a href="#attributes-valuemissingerror"><code>valuemissingerror</code></a>
  </dt>
  <dd>
    <p>
      Determines the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>validationMessage</code></a> that the element will display if it has a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/valueMissing"><code>ValidityState.valueMissing</code></a> error. The element enters this error state if its value is an empty string when it has the <a href="#attributes-required"><code>required</code></a> attribute. If the element's <code>required</code> constraint is broken when its owning form is submitted, then form submission will fail, and the <code>valuemissingerror</code> will be shown to the user in an error message bubble.
    </p>
    <p>
      To learn more about client-side form validation, see MDN's <a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation">Client-side Form Validation</a> tutorial. If you're looking for a robust form validation library that works with Custom Elements, try the <a href="https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer"><code>FormValidityObserver</code></a>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-valueMissingError"><code>ComboboxField.valueMissingError</code></a> property.</p>
  </dd>

  <dt id="attributes-required">
    <a href="#attributes-required"><code>required</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/required"><code>required</code></a> boolean attribute seen on native form controls like the <code>&lt;select&gt;</code> element. Indicates that the element's owning form cannot be submitted if its value is an empty string.
    </p>
    <p>This attribute is reflected by the <a href="#properties-required"><code>ComboboxField.required</code></a> property.</p>
  </dd>
  
  <dt id="attributes-name">
    <a href="#attributes-name"><code>name</code></a>
  </dt>
  <dd>
    <p>
      Same as the <code>name</code> attribute seen on native form controls (e.g., <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#name"><code>&lt;input&gt;</code></a>). Ensures that the element's value will be submitted to the server under the specified <code>name</code> on form submission. The name can also be used to access the element via the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements"><code>HTMLFormElement.elements</code></a> property of the owning form.
    </p>
    <p>This attribute is reflected by the <a href="#properties-name"><code>ComboboxField.name</code></a> property.</p>
  </dd>

  <dt id="attributes-disabled">
    <a href="#attributes-disabled"><code>disabled</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled"><code>disabled</code></a> boolean attribute seen on native form controls like the <code>&lt;select&gt;</code> element. When this attribute is present, the entire <code>Combobox</code> component will become non-interactive, and its value will not be sent to the server.
    </p>
    <p>This attribute is reflected by the <a href="#properties-disabled"><code>ComboboxField.disabled</code></a> property.</p>
  </dd>
</dl>

## Properties

As a Custom Element, the `ComboboxField` inherits all of the methods and properties of the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `ComboboxField` are as follows:

<dl>
  <dt id="properties-value">
    <a href="#properties-value"><code>value</code></a>
  </dt>
  <dd>
    <p>
      Sets or retrieves the value of the element. Type is <code>string | null</code>. The values which this property accepts depend on the element's <a href="#attributes-valueis"><code>valueis</code></a> attribute.
    </p>
    <blockquote>
      <p>
        Note: This property cannot be set to <code>null</code> by the developer, and it will only return <code>null</code> if the <code>Combobox</code> component has no options <em>and</em> is <code>clearable</code> or <code>unclearable</code>.
      </p>
    </blockquote>
    <p>
      When the <code>ComboboxField</code>'s value is set to a valid string, the <code>ComboboxOption</code> with a matching value will be marked selected (if it exists). Similarly, whenever a new option is selected, the <code>ComboboxField</code>'s value will be updated to match that option's value.
    </p>
    <p>
      If the <code>ComboboxField</code> is given a new value that has a matching option, then its text content will be set to the matching option's label. Otherwise, the element's text content will be set to the new value.
    </p>
    <blockquote>
      <p>
        Note: Whenever a <code>ComboboxField</code>'s value is set to a string with a matching option, the element's text content will become the matching option's label. This happens even for Empty Value Options (e.g., <code>&lt;combobox-option&nbsp;value=""&gt;Pick an Option&lt;/combobox-option&gt;</code>), even if your <code>ComboboxField</code> is in <code>clearable</code> or <code>anyvalue</code> mode.
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
  <dd>Reflects the <a href="#attributes-filtermethod"><code>filtermethod</code></a> attribute. Type is <code>"startsWith" | "includes"</code>.</dd>

  <dt id="properties-valueIs">
    <a href="#properties-valueIs"><code>valueIs</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-valueis"><code>valueis</code></a> attribute. Type is <code>"unclearable" | "clearable" | "anyvalue"</code>.</dd>

  <dt id="properties-autoselectableOption">
    <a href="#properties-autoselectableOption"><code>autoselectableOption</code></a>
  </dt>
  <dd>
    <p>
      A read-only property which returns the option whose <code>label</code> matches the user's most recent filter. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) Type is <code>ComboboxOption | null</code>.
    </p>
    <p>
      This property is useful if you want to automatically select options for your users as they type. For example, in a <a href="#events-filterchange"><code>filterchange</code></a> event listener, you could check for an <code>autoselectableOption</code> and select it if it exists. Note that the user's filter must <em>exactly</em> match an option's label (including casing) for an <code>autoselectableOption</code> to exist.
    </p>
    <p>This property will become <code>null</code> in any of the following scenarios:</p>
    <ul>
      <li>The user's most recent filter didn't match any of the (enabled) options.</li>
      <li>The <code>ComboboxField</code>'s text content was altered because of a change to its <code>value</code>.</li>
      <li>The <code>ComboboxField</code> was expanded and the user has not yet applied a filter.</li>
    </ul>
    <p>
      Note that this property persists when the <code>ComboboxField</code> is <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event">blurred</a>. Thus, if you prefer to auto-select options when the user leaves the searchbox, that is doable as well.
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

  <dt id="properties-listbox">
    <a href="#properties-listbox"><code>listbox</code></a>
  </dt>
  <dd>A read-only property which returns the <a href="./combobox-listbox.md"><code>ComboboxListbox</code></a> that this element controls.</dd>

  <dt id="properties-text">
    <a href="#properties-text"><code>text</code></a>
  </dt>
  <dd>
    <p>
      A read-only property which returns the singular <a href="https://developer.mozilla.org/en-US/docs/Web/API/Text"><code>Text</code></a> Node associated with the <code>ComboboxField</code>. To alter the <code>ComboboxField</code>'s text content, <a href="https://developer.mozilla.org/en-US/docs/Web/API/CharacterData/data">update</a> this Node <strong><em>instead of</em></strong> using the common <a href="https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent"><code>Node.textContent</code></a> property.
    </p>
    <blockquote>
      <p>Note: Directly altering the <code>data</code> of the <code>Text</code> Node can lead to a confusing UX if not done wisely, so be careful when doing so. In practice, you should never need to update the element's text content yourself.</p>
    </blockquote>
  </dd>

  <dt id="properties-required">
    <a href="#properties-required"><code>required</code></a>
  </dt>
  <dd>
    Same as the boolean <code>required</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/required"><code>&lt;select&gt;</code></a> element: It reflects the value of the <a href="#attributes-required"><code>required</code></a> attribute.
  </dd>

  <dt id="properties-name">
    <a href="#properties-name"><code>name</code></a>
  </dt>
  <dd>
    Same as the <code>name</code> property found on native form controls (e.g., <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/name"><code>&lt;input&gt;</code></a>): It reflects the value of the <a href="#attributes-name"><code>name</code></a> attribute. Type is <code>string</code>.
  </dd>
  
  <dt id="properties-disabled">
    <a href="#properties-disabled"><code>disabled</code></a>
  </dt>
  <dd>
    Same as the boolean <code>disabled</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/disabled"><code>&lt;select&gt;</code></a> element: It reflects the value of the <a href="#attributes-disabled"><code>disabled</code></a> attribute.
  </dd>

  <dt id="properties-labels">
    <a href="#properties-label"><code>labels</code></a>
  </dt>
  <dd>
    Same as the read-only <code>labels</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/labels"><code>&lt;select&gt;</code></a> element: Returns a <a href="https://developer.mozilla.org/en-US/docs/Web/API/NodeList"><code>NodeList</code></a> of all the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label"><code>&lt;label&gt;</code></a> elements associated with the <code>ComboboxField</code>.
  </dd>

  <dt id="properties-form">
    <a href="#properties-form"><code>form</code></a>
  </dt>
  <dd>
    Same as the read-only <code>form</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/form"><code>&lt;select&gt;</code></a> element: Returns the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement"><code>HTMLFormElement</code></a> with which the <code>ComboboxField</code> is associated. Returns <code>null</code> if no <code>&lt;form&gt;</code> owns the element.
  </dd>

  <dt id="properties-validity">
    <a href="#properties-validity"><code>validity</code></a>
  </dt>
  <dd>
    Same as the read-only <code>validity</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/validity"><code>&lt;select&gt;</code></a> element: Returns the element's <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState"><code>ValidityState</code></a> object.
  </dd>

  <dt id="properties-validationMessage">
    <a href="#properties-validationMessage"><code>validationMessage</code></a>
  </dt>
  <dd>
    Same as the read-only <code>validationMessage</code> property found on native form controls (e.g., <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>&lt;input&gt;</code></a>): Returns the message that will be displayed to users when the <code>ComboboxField</code> fails constraint validation. Type is <code>string</code>. To learn more about client-side form validation and when the user is shown an error message bubble, see MDN's <a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation"><em>Client-side Form Validation</em></a> tutorial.
  </dd>

  <dt id="properties-willValidate">
    <a href="#properties-willValidate"><code>willValidate</code></a>
  </dt>
  <dd>
    Same as the read-only boolean <code>willValidate</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/willValidate"><code>&lt;select&gt;</code></a> element: Returns <code>false</code> if the element will skip constraint validation. See <a href="https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate">MDN's Documentation</a> for more info on how <code>willValidate</code> is determined for form controls.
  </dd>
</dl>

## Static Properties

The following properties are defined directly on the <code>ComboboxField</code> class itself, rather than on the instances of the class.

<dl>
  <dt id="static-properties-defaultNoMatchesMessage">
    <a href="#static-properties-defaultNoMatchesMessage"><code>defaultNoMatchesMessage</code></a>
  </dt>
  <dd>
    <p>The default value for the <a href="#attributes-nomatchesmessage"><code>nomatchesmessage</code></a> attribute. Type is <code>string</code>.</p>
    <p>
      Note: This is the default "No Matches Message" for <strong><em>all</em></strong> instances of the <code>ComboboxField</code>. To learn more about how to customize the display of the "No Matches Message", see our <a href="./guides/styling-the-combobox.md#styling-the-no-matches-message">guides</a>.
    </p>
  </dd>
</dl>

## Methods

In addition to the methods that exist on the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface, the `ComboboxField` defines the instance methods listed below.

> Note: Any items labeled `advanced` are only intended for handling special, **_uncommon_** use cases; you **_don't_** need to learn about them. However, you might find them useful for edge cases, like enhancing performance when filtering an extremely large list of options.

<dl>
  <dt id="methods-forceEmptyValue">
    <a href="#methods-forceEmptyValue"><code>forceEmptyValue()</code></a> Signature: <code>() => void</code>
  </dt>
  <dd>
    <p>
      Sets the <code>ComboboxField</code>'s value <em>and</em> text content to an empty string. This is only allowed when the element's <a href="#attributes-valueis"><code>valueis</code></a> attribute is <code>clearable</code> or <code>anyvalue</code>.
    </p>
    <p>
      This method is useful when working with <code>clearable</code>/<code>anyvalue</code> <code>ComboboxField</code>s that have an Empty Value Option (e.g., <code>&lt;combobox-option&nbsp;value=""&gt;Pick an Option&lt;/combobox-option&gt;</code>). In these scenarios, setting <a href="#properties-value"><code>ComboboxField.value</code></a> to an empty string will cause the element's text content to become the Empty Value Option's label, whereas calling <code>forceEmptyValue()</code> will set <em>both</em> the element's value <em>and</em> its text content to an empty string.
    </p>
  </dd>

  <dt id="methods-getOptionByValue">
    <a href="#methods-getOptionByValue"><code>getOptionByValue()</code></a> Signature: <code>(value: string) => ComboboxOption | null</code>
  </dt>
  <dd>Retrieves the option with the specified value (if it exists).</dd>

  <dt id="methods-acceptsValue">
    <a href="#methods-acceptsValue"><code>acceptsValue()</code></a> Signature: <code>(value: string) => boolean</code>
  </dt>
  <dd>
    <p>Returns <code>true</code> if the <code>ComboboxField</code> will accept the provided value <em>even when no matching option exists</em>.</p>
    <p>This method is primarily used for internal purposes, though you may find it useful if you extend/override any of the <code>Combobox</code> component's features.</p>
  </dd>

  <dt id="methods-checkValidity">
    <a href="#methods-checkValidity"><code>checkValidity()</code></a> Signature: <code>() => boolean</code>
  </dt>
  <dd>
    <p>
      Same as the <code>checkValidity()</code> method found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/checkValidity"><code>&lt;select&gt;</code></a> element: Returns <code>true</code> if the element passes constraint validation. Otherwise, returns <code>false</code>. If validation fails, an <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event"><code>invalid</code></a> event will be fired on the element, but the element <em>will not</em> display an error message bubble.
    </p>
  </dd>

  <dt id="methods-reportValidity">
    <a href="#methods-reportValidity"><code>reportValidity()</code></a> Signature: <code>() => boolean</code>
  </dt>
  <dd>
    <p>
      Same as the <code>reportValidity()</code> method found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/reportValidity"><code>&lt;select&gt;</code></a> element: Behaves the same as the <a href="#methods-checkValidity"><code>checkValidity()</code></a> method. However, it <em>will</em> display an error message bubble if the element fails constraint validation, as long as the <code>invalid</code> event has not been canceled.
    </p>
  </dd>

  <dt id="methods-setCustomValidity">
    <a href="#methods-setCustomValidity"><code>setCustomValidity()</code></a> Signature: <code>(error: string) => void</code>
  </dt>
  <dd>
    <p>
      Same as the <code>setCustomValidity()</code> method found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/setCustomValidity"><code>&lt;select&gt;</code></a> element: Marks the element as invalid by giving it a custom error message. This error state/message takes precedent over all other error states/messages (such as the <code>required</code> error state/message). Note that any form control which has a custom error message will always fail constraint validation. (This is also true for native form controls.) To remove the error, call this method with an empty string.
    </p>
  </dd>

  <dt id="methods-optionMatchesFilter">
    <a href="#methods-optionMatchesFilter"><code>optionMatchesFilter()</code></a> (advanced) Signature: <code>(option: ComboboxOption) => boolean</code>
  </dt>
  <dd>
    <p>
      The method used by the <code>ComboboxField</code> to determine if a <code>ComboboxOption</code> matches the user's filter. Returns <code>true</code> if an option's label matches the user's current filter.
    </p>
    <p>
      <strong>NOTE: You should never need to call this method directly.</strong> However, if you want to alter the element's filtering logic, you can <em>override</em> this method to do so. For example, you could override this method to support regex-based filtering. (Regex-based filtering might not be very intuitive or performant for most users, though.)
    </p>
    <p>
      To compare an option against the user's filter, you'll need to compare the <code>ComboboxOption</code> argument against the <a href="#properties-text"><code>ComboboxField.text</code></a>. For example: <code>option.label.startsWith(this.text.data)</code>. See the <a href="../ComboboxField.js">current implementation</a> of the <code>ComboboxField</code> to get ideas on how you can structure your method override. (Remember that you have access to <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super"><code>super</code></a> as well.)
    </p>
    <blockquote>
      <p>
        <strong>WARNING</strong>: The <a href="#attributes-filtermethod"><code>filtermethod</code></a> attribute's behavior is made possible by the <code>ComboboxField</code>'s default implementation for the <code>optionMatchesFilter()</code> method. Thus, if you override this method, the <code>filtermethod</code> attribute will become useless unless you take the attribute into account in your method override.
      </p>
      <p>
        You don't <em>need</em> to account for this attribute in your method override unless you want to preserve the attribute's behavior. However, preserving the attribute's behavior is <em>recommended</em> because it will reduce confusion for consumers of your component. (Alternatively, if you don't want to account for the <code>filtermethod</code> attribute at all, you can mark the <a href="#properties-filterMethod"><code>ComboboxField.filterMethod</code></a> accessor as deprecated by using a <a href="https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#deprecated">JSDoc</a> in your Custom Element class extension.)
      </p>
    </blockquote>
  </dd>

  <dt id="methods-getFilteredOptions">
    <a href="#methods-getFilteredOptions"><code>getFilteredOptions()</code></a> (advanced) Signature: <code>() => GetFilteredOptionsReturnType</code>
  </dt>
  <dd>
    <p>
      Returns the options that match the user's current filter. When this method is called, all options that match the user's current filter will have their <a href="./combobox-option.md#properties-filteredOut"><code>ComboboxOption.filteredOut</code></a> property set to <code>false</code> <em>before</em> they are returned. Similarly, options which don't match the user's current filter will have this property set to <code>true</code>. The <code>GetFilteredOptionsReturnType</code> has the following shape:
    </p>
    <dl>
      <dt><code>matchingOptions: ComboboxOption[]</code></dt>
      <dd>The (ordered) list of options which match the user's current filter.<dd>
      <dt><code>autoselectableOption: ComboboxOption | undefined</code> (Optional)</dt>
      <dd>The option which is a candidate for automatic selection. Updates the <a href="#properties-autoselectableOption"><code>ComboboxField.autoselectableOption</code></a> (but does not select the option).</dd>
    </dl>
    <p>
      <strong>NOTE: You should <em>never</em> call this method directly.</strong> As noted above, this method mutates the <code>Combobox</code> component's options, so it is dangerous to call this method arbitrarily. Only the <code>ComboboxField</code> may call this method, and it does so only when the user changes the filter, or on an as-needed basis when the options are dynamically changed. This internal method is publicly exposed so that developers can <strong><em>completely</em></strong> overhaul the element's filtering logic, which can be accomplished by overriding the method.
    </p>
    <p>
      If you <em>only</em> need to change the element's filtering logic, then you should override <a href="#methods-optionMatchesFilter"><code>optionMatchesFilter()</code></a>, <strong>not</strong> <code>getFilteredOptions()</code>. But if you <em>also</em> need fine-tuned control over how the options are iterated for filtering (for example, if you prefer to filter options with a <a href="https://en.wikipedia.org/wiki/Trie"><code>Trie</code></a> instead of an <a href="https://en.wikipedia.org/wiki/Dynamic_array"><code>ArrayList</code></a>), then you should override <code>getFilteredOptions()</code>. For more details on how to override this method effectively for performance gains, see our <a href="./guides/filtering-performance-enhancements.md"><em>Filtering Performance Enhancements</em></a> guide.
    </p>
    <blockquote>
      <p>
        <strong>WARNING</strong>: <code>optionMatchesFilter()</code> is used in the <code>ComboboxField</code>'s default implementation of the <code>getFilteredOptions()</code> method. Thus, overriding <code>getFilteredOptions()</code> will render the <code>optionMatchesFilter()</code> method useless. And since the <a href="#attributes-filtermethod"><code>filtermethod</code></a> attribute's behavior is implemented by <code>optionMatchesFilter()</code>, overriding <code>getFilteredOptions()</code> will render this attribute useless as well.
      </p>
      <p>
        If your class extension doesn't intend to preserve the behavior/purpose of <code>optionMatchesFilter()</code> and <code>filtermethod</code>, then you should use a <a href="https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#deprecated">JSDoc</a> to mark both the method and the <a href="#properties-filterMethod"><code>ComboboxField.filterMethod</code></a> accessor as deprecated.
      </p>
    </blockquote>
  </dd>
</dl>

## Events

As a Custom Element, the <code>ComboboxField</code> supports all of the events for the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement"><code>HTMLElement</code></a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element"><code>Element</code></a> and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Node"><code>Node</code></a> interfaces. Additionally, it supports the events below. You can listen for them by using the <a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener">addEventListener()</code></a> method.

<dl>
  <dt id="events-input">
    <a href="#events-input"><code>input</code></a>
  </dt>
  <dd>
    <p>
      Fires whenever the user changes the <code>ComboboxField</code>'s value by selecting an option. If the <code>ComboboxField</code> is <a href="#attributes-filter">filterable</a>, then this event is also fired whenever the user changes the element's value by updating the filter.
    </p>
    <p>
      Note that a filter update will always cause a value change if the <code>ComboboxField</code> is in <a href="#attributes-valueis"><code>anyvalue</code></a> mode. In <a href="#attributes-valueis"><code>clearable</code></a> mode, a filter-initiated value change only happens when the user clears the filter. In <a href="#attributes-valueis"><code>unclearable</code></a> mode, filter updates do not cause value changes.
    </p>
    <p>
      You can consider this event to be analogous to the native <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event"><code>input</code></a> event if the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select"><code>&lt;select&gt;</code></a> and <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input"><code>&lt;input&gt;</code></a> elements were merged into a single element. However, there are two things to note:
    </p>
    <ol>
      <li>This event is not cancelable.</li>
      <li>
        The dispatched event is only guaranteed to be an <a href="https://developer.mozilla.org/en-US/docs/Web/API/InputEvent"><code>InputEvent</code></a> if the value change was caused by a filter update (similar to the <code>&lt;input&gt;</code> element). If the value change was caused by selecting an option, then the event will be a regular <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event"><code>Event</code></a> (similar to the <code>&lt;select&gt;</code> element).
      </li>
    </ol>
  </dd>

  <dt id="events-change">
    <a href="#events-change"><code>change</code></a>
  </dt>
  <dd>
    <p>
      Fires whenever the user changes the <code>ComboboxField</code>'s value by selecting an option. If the <code>ComboboxField</code> is <a href="#attributes-filter">filterable</a>, then this event is also fired when the element loses focus <em>if the element's value was most recently changed by a filter update</em>.
    </p>
    <p>
      You can consider this event to be analogous to the native <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event"><code>change</code></a> event if the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select"><code>&lt;select&gt;</code></a> and <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input"><code>&lt;input&gt;</code></a> elements were merged into a single element. Just like the native event, this event is not cancelable, and its type is <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event"><code>Event</code></a>.
    </p>
  </dd>

  <dt id="events-filterchange">
    <a href="#events-filterchange"><code>filterchange</code></a>
  </dt>
  <dd>
    <p>
      Fires whenever the user changes the <code>ComboboxField</code>'s filter. (Only relevant in <a href="#attributes-filter">Filter Mode</a>.) The dispatched event is always of type <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event"><code>Event</code></a>.
    </p>
    <p>
      Canceling this event will stop the <code>ComboboxField</code> from applying the user's current filter to the options. For obvious reasons, this is generally discouraged. However, this can be useful if you are loading options asynchronously (because you will prevent the <code>ComboboxField</code> from trying to filter outdated options). For additional tips on loading options asynchronously, see our <a href="./guides/loading-options-asynchronously.md"><em>Loading Options Asynchronously</em></a> guide.
    </p>
  </dd>
</dl>

## What's Next?

- Get a [high-level](.) view of how the `Combobox` component works. Or, dive deeper into the component's other segments:
  - [`<select-enhancer>`](./select-enhancer.md)
  - [`<combobox-listbox>`](./combobox-listbox.md)
  - [`<combobox-option>`](./combobox-option.md)
- Read our [guides](./guides) to learn more about what you can accomplish with our component.

<!-- TODO: Guides should document i18n ... Actually, our component probably supports `i18n` already as is. It's just that some people might prefer to use `toLowerCaseLocale()` instead... but it's possible that might not be needed? -->

<!-- TODO: Should we document behavior when all options are removed? This might hold significance for people trying to load options async (if using [un]clearable). ... Probably don't want to document it here. But perhaps we can document tips on async loading, and mention the nuance of removing all options prematurely. -->
