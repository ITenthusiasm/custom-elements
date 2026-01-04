# The `CheckboxGroup` Element

The `CheckboxGroup` is a Custom Element which progressively enhances a semantic group of checkbox `input` elements, providing the group with convenient features like seameless form validation and easier value management.

## Install

```
npm install @itenthusiasm/custom-elements
```

## Quickstart

```html
<!-- HTML -->
<form>
  <checkbox-group id="toppings" name="toppings" min="2" max="4">
    <fieldset>
      <label for="toppings">Toppings</label>

      <div>
        <input id="pepperoni" type="checkbox" value="pepperoni" checked />
        <label for="pepperoni">Pepperoni</label>

        <input id="sausage" type="checkbox" value="sausage" />
        <label for="sausage">Sausage</label>

        <input id="onions" type="checkbox" value="onions" />
        <label for="onions">Onions</label>

        <input id="peppers" type="checkbox" value="peppers" />
        <label for="peppers">Peppers</label>

        <input id="olives" type="checkbox" value="olives" />
        <label for="olives">Olives</label>
      </div>
    </fieldset>
  </checkbox-group>
</form>
```

> **NOTE: Only the `<fieldset>` element is allowed to be a direct descendant of a `<checkbox-group>`.**

```js
/* JavaScript */
import { CheckboxGroup } from "@itenthusiasm/custom-elements";
// or import { CheckboxGroup } from "@itenthusiasm/custom-elements/CheckboxGroup";

customElements.define("checkbox-group", CheckboxGroup);

// Retrieve some info about the `checkbox-group`
const form = document.querySelector("form");
const formData = new FormData(form);
console.log(formData.getAll("toppings")); // ["pepperoni"]

const checkboxGroup = document.querySelector("checkbox-group");
console.log(checkboxGroup.form === form); // true
console.log(checkboxGroup.value); // ["pepperoni"]

// Right now, the group is invalid because the `min` attribute dictates that at least 2 items must be selected
console.log(checkboxGroup.validity.valid); // false
console.log(checkboxGroup.validity.rangeUnderflow); // true
```

## Progressive Enhancement

The example HTML displayed at the [beginning](#quickstart) of this document is fully functional, but it only works when JavaScript is enabled for your application. To ensure that your checkbox group will work even when JavaScript is disabled, you should render your checkbox group the "old fashioned way".

```html
<form>
  <checkbox-group min="2" max="4">
    <fieldset>
      <legend>Toppings</legend>

      <div>
        <input id="pepperoni" name="toppings" type="checkbox" value="pepperoni" checked />
        <label for="pepperoni">Pepperoni</label>

        <input id="sausage" name="toppings" type="checkbox" value="sausage" />
        <label for="sausage">Sausage</label>

        <input id="onions" name="toppings" type="checkbox" value="onions" />
        <label for="onions">Onions</label>

        <input id="peppers" name="toppings" type="checkbox" value="peppers" />
        <label for="peppers">Peppers</label>

        <input id="olives" name="toppings" type="checkbox" value="olives" />
        <label for="olives">Olives</label>
      </div>
    </fieldset>
  </checkbox-group>
</form>
```

The above HTML will work even if JavaScript is disabled. When the user submits the form provided above, an array of values containing every item which the user selected will be sent to the server (even when JS is disabled).

Remember that client-side form validation for checkbox groups is a feature provided by the `CheckboxGroup` Web Component (meaning that JavaScript must be enabled). So you'll need server-side validation in place to enforce that the minimum/maximum number of items is selected to cover the case where a user has JS disabled. (That said, you should _always_ write server-side validation anyway to ensure the security and integrity of your web applications.)

When the `CheckboxGroup` Custom Element is registered and mounted to the DOM, it transforms the HTML above into the following:

```html
<form>
  <checkbox-group id="RANDOMLY_GENERATED_ID" name="toppings" min="2" max="4">
    <fieldset role="none">
      <label for="RANDOMLY_GENERATED_ID">Toppings</label>

      <div>
        <input id="pepperoni" type="checkbox" value="pepperoni" form="" checked />
        <label for="pepperoni">Pepperoni</label>

        <input id="sausage" type="checkbox" value="sausage" form="" />
        <label for="sausage">Sausage</label>

        <input id="onions" type="checkbox" value="onions" form="" />
        <label for="onions">Onions</label>

        <input id="peppers" type="checkbox" value="peppers" form="" />
        <label for="peppers">Peppers</label>

        <input id="olives" type="checkbox" value="olives" form="" />
        <label for="olives">Olives</label>
      </div>
    </fieldset>
  </checkbox-group>
</form>
```

As you can see from the transformed markup above, the `CheckboxGroup` does a few things. It...

1. Replaces the `<legend>` element with a `<label>` element.
   - The `CheckboxGroup` can only be labeled by a `<label>` element, not a `<legend>` element. This is the reason for replacing the `<legend>`, and it is the reason for the randomly-generated `id` as well. If you provide your own `id` to the `<checkbox-group>` element, then the component will use that ID instead of randomly generating its own.
   - If no `<legend>` is found on mount, then the component will not try to create an accessible label for itself.
2. Transfers the `name` attribute (if it exists) from the `checkbox`es to itself.
   - Since the `<checkbox-group>` itself is a form control, and since it represents the whole group of `checkbox`es, it is the only form control in the group that needs the `name` attribute.
3. Dissociates the `checkbox`es from the wrapping `<form>`.
   - This is done by applying the empty `[form=""]` attribute to all the `checkbox`es, and it is done to avoid running into edge cases where events or form data could be processed in a duplicated fashion. Again, since the `<checkbox-group>` is a form control representing the whole group of `checkbox`es, it is the only form control that needs to be associated with the `<form>`.
4. Applies the `none` role to the `<fieldset>` element.
   - `<fieldset>`s typically have the accessible [`group`](https://w3c.github.io/aria/#group) role. The `<checkbox-group>` element also has this role, so `[role="none"]` is applied to the `<fieldset>` to avoid duplicating accessibility information.

Although it wasn't shown in the example above, the `<checkbox-group>` does one last thing on mount: It transfers all of the `<fieldset>`'s attributes to itself. This can be useful, for example, for transferring important accessibility attributes (like `aria-describedby`) from the `<fieldset>` to the `<checkbox-group>` after your application's JavaScript has loaded.

> Note: No matter what role the `<fieldset>` has on mount, the `<checkbox-group>` will always end up with a `group` role after mounting, and the `<fieldset>` will always end up with a `none` role.

### Progressive Enhancement in JS Frameworks

Some JS frameworks (such as React) may get confused if you remove elements from the DOM with tools other than what the framework provides. This makes the `<legend>` replacement feature of the `<checkbox-group>` component problematic. To preserve this progressive enhancement behavior without breaking the expectations of your framework, you can write a component that performs the `<legend>` replacement itself. Here is an example in React:

```tsx
import { useState, useEffect } from "react";
import type {} from "@itenthusiasm/custom-elements/react";
// Or import type {} from "@itenthusiasm/custom-elements/CheckboxGroup/react";

interface CheckboxGroupProps extends React.ComponentProps<"checkbox-group"> {
  label?: string;
}

export default function CheckboxGroup({ label, children, ...rest }: CheckboxGroupProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <checkbox-group {...(mounted ? rest : undefined)} manual>
      <fieldset {...(mounted ? undefined : (rest as React.ComponentProps<"fieldset">))}>
        {!!label && (mounted ? <label htmlFor={rest.id}>{label}</label> : <legend>{label}</legend>)}

        {children}
      </fieldset>
    </checkbox-group>
  );
}
```

Notice the [`manual`](#attributes-manual) attribute that was applied to the `<checkbox-group>`. This tells the component _not_ to remove or add any children on its own, giving developers the freedom to make such modifications themselves. Note that the `CheckboxGroup` will still perform other automated actions unrelated to DOM insertion/removal in this mode, such as altering the `name` and `form` attributes of every `checkbox` inserted into it. These other actions are all safe for JS frameworks.

## TypeScript Usage in JS Frameworks

Many JS frameworks, such as Svelte and React, often define their own "Element Namespaces". Because of this, most frameworks are not able (on their own) to recognize the correct attributes, properties, and event listeners that belong to the Custom Elements which you use. Thankfully, our library ships with TypeScript types that tell the various JS Frameworks about the existence and shape of our Custom Elements. To define _all_ of our library's Custom Elements within a Framework's "Element Namespace", simply import the appropriate type definition file:

```ts
import type {} from "@itenthusiasm/custom-elements/types/react";
// For Svelte: import type {} from "@itenthusiasm/custom-elements/types/svelte";
// For Vue: import type {} from "@itenthusiasm/custom-elements/types/vue";
// etc. ...
```

If you only intend to use _some_ of the Custom Elements provided by this library, then you should only import the types for those components.

```ts
// Define ONLY the `CheckboxGroup` component's types in the framework's "Element Namespace"
import type {} from "@itenthusiasm/custom-elements/CheckboxGroup/types/react";
// For Svelte: import type {} from "@itenthusiasm/custom-elements/CheckboxGroup/types/svelte";
// For Vue: import type {} from "@itenthusiasm/custom-elements/CheckboxGroup/types/vue";
// etc. ...
```

The component also ships with types that enhance the native DOM methods if you need them:

```ts
import type {} from "@itenthusiasm/custom-elements/types/dom";
// Or more specifically, import type {} from "@itenthusiasm/custom-elements/CheckboxGroup/types/dom";

// This variable will be properly typed by TypeScript now, instead of just being a general `Element` type.
const checkboxGroup = document.querySelector("checkbox-group");
```

## Accessibility

For accessibility purposes, it is recommended to render your grouped `checkbox`es using HTML that semantic and clear. Instead of using the generic and vague `<div>` element, prefer using the list-related elements such as `<ul>` and `<li>`:

```html
<form>
  <checkbox-group min="2" max="4">
    <fieldset>
      <legend>Toppings</legend>

      <ul>
        <li>
          <input id="pepperoni" name="toppings" type="checkbox" value="pepperoni" checked />
          <label for="pepperoni">Pepperoni</label>
        </li>

        <li>
          <input id="sausage" name="toppings" type="checkbox" value="sausage" />
          <label for="sausage">Sausage</label>
        </li>

        <li>
          <input id="onions" name="toppings" type="checkbox" value="onions" />
          <label for="onions">Onions</label>
        </li>
      </ul>
    </fieldset>
  </checkbox-group>
</form>
```

This is recommended because it will enable Screen Readers to see and announce the number of `checkbox`es in a list if the markup structure shown above is used. This helps your users know where they are, and what they should expect.

## CSS Styles

Because the `<checkbox-group>` is simply a wrapper around the `<fieldset>` element, it does not need any custom CSS. Therefore, the library does not ship any custom CSS for this component. You can style the `<checkbox-group>`, `<fieldset>`, and other elements as usual.

## Restrictions

The `CheckboxGroup` Custom Element enforces the following restrictions:

1. Only the `<fieldset>` element is allowed to be a direct descendant of a `<checkbox-group>`.
2. Checkboxes (`<input type="checkbox">`) are the only kind of form controls allowed within the `<checkbox-group>`. Other kinds of form controls are forbidden. However, all _non-form-control_ elements are permitted within the `<checkbox-group>` (as demonstrated in the examples above).
3. Nesting `<checkbox-group>`s is not supported.

## API

This section describes the attributes, properties, and events associated with the `CheckboxGroup` Custom Element.

### Attributes

As a Custom Element, the `CheckboxGroup` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `CheckboxGroup` are as follows:

<dl>
  <dt id="attributes-name">
    <a href="#attributes-name"><code>name</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#name"><code>name</code></a> attribute seen on native form controls like the <code>&lt;input&gt;</code> element. Ensures that the element's value will be submitted to the server under the specified <code>name</code> on form submission. The name can also be used to access the element via the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements"><code>HTMLFormElement.elements</code></a> property of the owning form.
    </p>
    <p>This attribute is reflected by the <a href="#properties-name"><code>CheckboxGroup.name</code></a> property.</p>
  </dd>

  <dt id="attributes-disabled">
    <a href="#attributes-disabled"><code>disabled</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled"><code>disabled</code></a> boolean attribute seen on native form controls like the <code>&lt;input&gt;</code> element. When this attribute is present, the entire <code>CheckboxGroup</code> component (including the checkboxes that it owns) will become non-interactive, and its value will not be sent to the server.
    </p>
    <p>This attribute is reflected by the <a href="#properties-disabled"><code>CheckboxGroup.disabled</code></a> property.</p>
  </dd>

  <dt id="attributes-required">
    <a href="#attributes-required"><code>required</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/required"><code>required</code></a> boolean attribute seen on native form controls like the <code>&lt;input&gt;</code> element. Indicates that the element's owning form cannot be submitted if its value is an empty array (i.e., if no checkboxes are selected).
    </p>
    <blockquote>
      <p>
        NOTE: In general, you should always prefer the <a href="#attributes-min"><code>min</code></a> attribute to the <code>required</code> attribute. This is because the <code>required</code> attribute is effectively the same as setting <code>[min="1"]</code>. The <code>min</code> attribute is more succinct and vastly more flexible.
      </p>
    </blockquote>
    <p>This attribute is reflected by the <a href="#properties-required"><code>CheckboxGroup.required</code></a> property.</p>
  </dd>

  <dt id="attributes-valuemissingerror">
    <a href="#attributes-valuemissingerror"><code>valuemissingerror</code></a>
  </dt>
  <dd>
    <p>
      Determines the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>validationMessage</code></a> that the element will display if it has a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/valueMissing"><code>ValidityState.valueMissing</code></a> error. The element enters this error state if its value is an empty array when it has the <a href="#attributes-required"><code>required</code></a> attribute. If the element's <code>required</code> constraint is broken when its owning form is submitted, then form submission will fail, and the <code>valuemissingerror</code> will be shown to the user in an error message bubble.
    </p>
    <p>
      To learn more about client-side form validation, see MDN's <a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation"><em>Client-side Form Validation</em></a> tutorial. If you're looking for a robust form validation library that works with Custom Elements, try the <a href="https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer"><code>FormValidityObserver</code></a>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-valueMissingError"><code>CheckboxGroup.valueMissingError</code></a> property.</p>
  </dd>

  <dt id="attributes-min">
    <a href="#attributes-min"><code>min</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#min"><code>min</code></a> attribute found on the native <code>&lt;input&gt;</code> element. Indicates that the element's owning form cannot be submitted until the minimum required number of items are selected. Note that the constraint is only applied if the attribute is a valid number.
    </p>
    <p>This attribute is reflected by the <a href="#properties-min"><code>CheckboxGroup.min</code></a> property.</p>
  </dd>

  <dt id="attributes-rangeunderflowerror">
    <a href="#attributes-rangeunderflowerror"><code>rangeunderflowerror</code></a>
  </dt>
  <dd>
    <p>
      Determines the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>validationMessage</code></a> that the element will display if it has a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/rangeUnderflow"><code>ValidityState.rangeUnderflow</code></a> error. The element enters this error state if the user has selected a number of items less than the value specified by the <a href="#attributes-min"><code>min</code></a> attribute. If the element's <code>min</code> constraint is broken when its owning form is submitted, then form submission will fail, and the <code>rangeunderflowerror</code> will be shown to the user in an error message bubble.
    </p>
    <blockquote>
      <p>
        NOTE: If the element's <code>min</code> and <a href="#attributes-required"><code>required</code></a> constraints are both broken, then only the <code>rangeunderflowerror</code> will be shown. This is to minimize the number of steps the user will need to take to fix the form control's value.
      </p>
    </blockquote>
    <p>This attribute is reflected by the <a href="#properties-rangeUnderflowError"><code>CheckboxGroup.rangeUnderflowError</code></a> property.</p>
  </dd>

  <dt id="attributes-max">
    <a href="#attributes-max"><code>max</code></a>
  </dt>
  <dd>
    <p>
      Same as the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input#max"><code>max</code></a> attribute found on the native <code>&lt;input&gt;</code> element. Indicates that the element's owning form cannot be submitted until the number of selected items is less than or equal to the maximum allowed amount. Note that the constraint is only applied if the attribute is a valid number.
    </p>
    <blockquote>
      <p>NOTE: You should always ensure that the <code>max</code> attribute is greater than or equal to the <a href="#attributes-min"><code>min</code></a> attribute.</p>
    </blockquote>
    <p>This attribute is reflected by the <a href="#properties-max"><code>CheckboxGroup.max</code></a> property.</p>
  </dd>

  <dt id="attributes-rangeoverflowerror">
    <a href="#attributes-rangeoverflowerror"><code>rangeoverflowerror</code></a>
  </dt>
  <dd>
    <p>
      Determines the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>validationMessage</code></a> that the element will display if it has a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/rangeOverflow"><code>ValidityState.rangeOverflow</code></a> error. The element enters this error state if the user has selected a number of items greater than the value specified by the <a href="#attributes-max"><code>max</code></a> attribute. If the element's <code>max</code> constraint is broken when its owning form is submitted, then form submission will fail, and the <code>rangeoverflowerror</code> will be shown to the user in an error message bubble.
    </p>
    <p>This attribute is reflected by the <a href="#properties-rangeOverflowError"><code>CheckboxGroup.rangeOverflowError</code></a> property.</p>
  </dd>

  <dt id="attributes-manual">
    <a href="#attributes-manual"><code>manual</code></a>
  </dt>
  <dd>
    <p>
      A boolean attribute indicating that the <code>CheckboxGroup</code> should not replace its <code>&lt;fieldset&gt;</code>'s accessible label (<code>&lt;legend&gt;</code>) with its own (<code>&lt;label&gt;</code>) when mounted. You should only enable this property if you intend to perform the label replacement yourself.
    </p>
    <p>
      Note that the other automated actions unrelated to DOM insertion/removal that are described in the <a href="#progressive-enhancement"><em>Progressive Enhancement</em></a> section will still occur even when this mode is turned on. (This is for accessibility purposes.)
    </p>
    <p>This attribute is reflected by the <a href="#properties-manual"><code>CheckboxGroup.manual</code></a> property.</p>
  </dd>
</dl>

## Properties

As a Custom Element, the `CheckboxGroup` inherits all of the methods and properties of the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `CheckboxGroup` are as follows:

<dl>
  <dt id="properties-value">
    <a href="#properties-value"><code>value</code></a>
  </dt>
  <dd>
    <p>Sets or retrieves the value of the element. Type is <code>string[]</code>.</p>
    <p>
      When this property is set, every checkbox with a <code>value</code> corresponding to an item in the array will be checked; all other checkboxes will be unchecked. If an item in the provided array has no corresponding checkbox, then it will be deleted.
    </p>
  </dd>

  <dt id="properties-name">
    <a href="#properties-name"><code>name</code></a>
  </dt>
  <dd>
    Same as the <code>name</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/name"><code>&lt;input&gt;</code></a> element: It reflects the value of the <a href="#attributes-name"><code>name</code></a> attribute. Type is <code>string</code>.
  </dd>

  <dt id="properties-disabled">
    <a href="#properties-disabled"><code>disabled</code></a>
  </dt>
  <dd>
    Same as the boolean <code>disabled</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/disabled"><code>&lt;input&gt;</code></a> element: It reflects the value of the <a href="#attributes-disabled"><code>disabled</code></a> attribute.
  </dd>

  <dt id="properties-required">
    <a href="#properties-required"><code>required</code></a>
  </dt>
  <dd>
    Same as the boolean <code>required</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/required"><code>&lt;input&gt;</code></a> element: It reflects the value of the <a href="#attributes-required"><code>required</code></a> attribute.
  </dd>

  <dt id="properties-valueMissingError">
    <a href="#properties-valueMissingError"><code>valueMissingError</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-valuemissingerror"><code>valuemissingerror</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-min">
    <a href="#properties-min"><code>min</code></a>
  </dt>
  <dd>
    Same as the <code>min</code> property found on the native <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/min"><code>&lt;input&gt;</code></a> element: It reflects the value of the <a href="#attributes-min"><code>min</code></a> attribute. Type is <code>string</code>.
  </dd>

  <dt id="properties-rangeUnderflowError">
    <a href="#properties-rangeUnderflowError"><code>rangeUnderflowError</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-rangeunderflowerror"><code>rangeunderflowerror</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-max">
    <a href="#properties-max"><code>max</code></a>
  </dt>
  <dd>
    Same as the <code>max</code> property found on the native <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/max"><code>&lt;input&gt;</code></a> element: It reflects the value of the <a href="#attributes-max"><code>max</code></a> attribute. Type is <code>string</code>.
  </dd>

  <dt id="properties-rangeOverflowError">
    <a href="#properties-rangeOverflowError"><code>rangeOverflowError</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-rangeoverflowerror"><code>rangeoverflowerror</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-manual">
    <a href="#properties-manual"><code>manual</code></a>
  </dt>
  <dd>A <code>boolean</code> property which reflects the value of the <a href="#attributes-manual"><code>manual</code></a> attribute.</dd>

  <dt id="properties-fieldset">
    <a href="#properties-fieldset"><code>fieldset</code></a>
  </dt>
  <dd>
    <p>
      Returns the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFieldSetElement"><code>HTMLFieldSetElement</code></a> wrapped by the <code>CheckboxGroup</code>. Useful for <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFieldSetElement/elements">iterating</a> over all of the group's checkboxes programmatically.
    </p>
  </dd>

  <dt id="properties-labels">
    <a href="#properties-labels"><code>labels</code></a>
  </dt>
  <dd>
    Same as the read-only <code>labels</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/labels"><code>&lt;input&gt;</code></a> element: Returns a <a href="https://developer.mozilla.org/en-US/docs/Web/API/NodeList"><code>NodeList</code></a> of all the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label"><code>&lt;label&gt;</code></a> elements associated with the <code>CheckboxGroup</code>.
  </dd>

  <dt id="properties-form">
    <a href="#properties-form"><code>form</code></a>
  </dt>
  <dd>
    Same as the read-only <code>form</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/form"><code>&lt;input&gt;</code></a> element: Returns the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement"><code>HTMLFormElement</code></a> with which the <code>CheckboxGroup</code> is associated. Returns <code>null</code> if no <code>&lt;form&gt;</code> owns the element.
  </dd>

  <dt id="properties-validity">
    <a href="#properties-validity"><code>validity</code></a>
  </dt>
  <dd>
    Same as the read-only <code>validity</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validity"><code>&lt;input&gt;</code></a> element: Returns the element's <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState"><code>ValidityState</code></a> object.
  </dd>

  <dt id="properties-validationMessage">
    <a href="#properties-validationMessage"><code>validationMessage</code></a>
  </dt>
  <dd>
    Same as the read-only <code>validationMessage</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage"><code>&lt;input&gt;</code></a> element: Returns the message that will be displayed to users when the <code>CheckboxGroup</code> fails constraint validation. Type is <code>string</code>. To learn more about client-side form validation and when the user is shown an error message bubble, see MDN's <a href="https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation"><em>Client-side Form Validation</em></a> tutorial.
  </dd>

  <dt id="properties-willValidate">
    <a href="#properties-willValidate"><code>willValidate</code></a>
  </dt>
  <dd>
    Same as the read-only boolean <code>willValidate</code> property found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/willValidate"><code>&lt;input&gt;</code></a> element: Returns <code>false</code> if the element will skip constraint validation. See <a href="https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate">MDN's Documentation</a> for more info on how <code>willValidate</code> is determined for form controls.
  </dd>
</dl>

## Methods

In addition to the methods that exist on the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface, the `CheckboxGroup` defines the instance methods listed below.

<dl>
  <dt id="methods-checkValidity">
    <a href="#methods-checkValidity"><code>checkValidity()</code></a> Signature: <code>() => boolean</code>
  </dt>
  <dd>
    <p>
      Same as the <code>checkValidity()</code> method found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/checkValidity"><code>&lt;input&gt;</code></a> element: Returns <code>true</code> if the element passes constraint validation. Otherwise, returns <code>false</code>. If validation fails, an <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event"><code>invalid</code></a> event will be fired on the element, but the element <em>will not</em> display an error message bubble.
    </p>
  </dd>

  <dt id="methods-reportValidity">
    <a href="#methods-reportValidity"><code>reportValidity()</code></a> Signature: <code>() => boolean</code>
  </dt>
  <dd>
    <p>
      Same as the <code>reportValidity()</code> method found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/reportValidity"><code>&lt;input&gt;</code></a> element: Behaves the same as the <a href="#methods-checkValidity"><code>checkValidity()</code></a> method. However, it <em>will</em> display an error message bubble if the element fails constraint validation, as long as the <code>invalid</code> event has not been canceled.
    </p>
  </dd>

  <dt id="methods-setCustomValidity">
    <a href="#methods-setCustomValidity"><code>setCustomValidity()</code></a> Signature: <code>(error: string) => void</code>
  </dt>
  <dd>
    <p>
      Same as the <code>setCustomValidity()</code> method found on native form controls like the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity"><code>&lt;input&gt;</code></a> element: Marks the element as invalid by giving it a custom error message. This error state/message takes precedence over all other error states/messages (such as the <code>required</code> error state/message and all the other ones). Note that any form control which has a custom error message will always fail constraint validation. (This is also true for native form controls.) To remove the error, call this method with an empty string.
    </p>
  </dd>
</dl>

## Events

As a Custom Element, the <code>CheckboxGroup</code> supports all of the events for the <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement"><code>HTMLElement</code></a>, <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element"><code>Element</code></a> and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Node"><code>Node</code></a> interfaces. Additionally, it supports the events below. You can listen for them by using the <a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener">addEventListener()</code></a> method.

<dl>
  <dt id="events-input">
    <a href="#events-input"><code>input</code></a>
  </dt>
  <dd>
    <p>
      Fires whenever the user toggles the state of a checkbox in a <code>CheckboxGroup</code> with their Mouse or Keyboard.
    </p>
    <p>
      Just like the native event for <code>&lt;input type="checkbox"&gt;</code> elements, this event is not cancelable, and its type is <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event"><code>Event</code></a>. Note: Although this event is not cancelable, it is possible to prevent a user's attempt at toggling a checkbox from succeeding by canceling the corresponding <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/click_event"><code>click</code></a> event.
    </p>
    <blockquote>
      <p>
        Note: The <code>CheckboxGroup</code> "absorbs" the <code>input</code> and <code>change</code> events dispatched by its checkboxes. Thus, if you want to listen for either of those events, you'll need to listen for them on the <code>CheckboxGroup</code>, not on the checkboxes.
      </p>
    </blockquote>
  </dd>

  <dt id="events-change">
    <a href="#events-change"><code>change</code></a>
  </dt>
  <dd>
    <p>Identical to the <a href="#events-input"><code>input</code></a> event, but fired <em>after</em> the <code>input</code> event.</p>
  </dd>
</dl>
