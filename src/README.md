# @itenthusiasm/custom-elements

Robust, accessible, and progressively-enhanceable [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) for common developer needs. Each component integrates seamlessly into your web applications, whether you use pure HTML/CSS/JS or you use a JS Framework.

## Features and Benefits

- **Framework Agnostic**: Because the components in this library are built using only Custom `HTMLElement`s, they work seamlessly in all JS Frameworks (and in pure-JS applications).
- **Integrates with Native Web Forms**: The components in this library [integrate](https://web.dev/articles/more-capable-form-controls) with the web's native `<form>` element, meaning that their values will be seen in the form's [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) and will be automatically [sent to the server](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data) when the form is submitted &mdash; all without writing a single line of JS.
- **Works with Various Form Libraries**: These components emit standard DOM events like [`input`](https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event) and [`change`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event), enabling them to work naturally with reputable form libraries (e.g., the [`Form Observer`](https://github.com/enthusiastic-js/form-observer), [`Conform`](https://conform.guide/), and [`React Hook Form`](https://react-hook-form.com/)).
- **Progressive Enhacement**: Every form-associated Custom Element in this library progressively enhances the native form controls. This guarantees that your forms will _always_ be fully operable and accessible, even if your users have JS disabled.
- **Highly Customizable**: These components are flexible enough to work with whatever CSS you provide, and their functionality can be enhanced or overriden through [class extension](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends).
- **Performant**: Unlike many other alternatives, these components have been cleverly designed to work without complex state management tools or aggressive DOM Tree manipulation. This makes them fast and memory-efficient.
- **No Dependencies**: The components in this library are built on the native web platform instead of extending other frameworks or libraries, guaranteeing your bundle size remains as small as possible.

<!-- TODO: Link to article explaining how progressively-enhanced Form Controls _greatly_ simplify frontend code. -->

## Install

```
npm install @itenthusiasm/custom-elements
```

## Components

Below are the components that this library currently provides. Each component has its own `README` which you can view to learn more about how the component operates.

<dl>
  <dt id="components-combobox">
    <a href="./Combobox"><code>Combobox</code></a>
  </dt>
  <dd>
    <p>
      Progressively enhances the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select"><code>&lt;select&gt;</code></a> element, transforming it into a stylable, (optionally) filterable <a href="https://www.w3.org/TR/wai-aria-1.2/#combobox"><code>combobox</code></a> which meets WAI-ARIA's <a href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/">accessibility requirements</a>. The <code>Combobox</code> component behaves just like the native form controls, meaning that it dispatches the standard <code>input</code>/<code>change</code> events, is <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements">associated</a> with its owning form, and automatically participates in all form activity, <a href="https://web.dev/articles/more-capable-form-controls">including form submission</a>.
    </p>
    <p>
      <a href="https://stackblitz.com/edit/custom-elements-combobox?file=index.html,src%2Fmain.ts">Stackblitz Form Integration Demo</a>
    </p>
  </dd>

  <dt id="components-checkbox-group">
    <a href="./CheckboxGroup"><code>CheckboxGroup</code></a>
  </dt>
  <dd>
    <p>
      Wraps a semantic group of checkbox <code>&lt;input&gt;</code> elements, progressively enhancing them with convenient features like group-level form validation and value management. The <code>CheckboxGroup</code> component behaves just like the native form controls, meaning that it dispatches the standard <code>input</code>/<code>change</code> events, is <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements">associated</a> with its owning form, and automatically participates in all form activity, <a href="https://web.dev/articles/more-capable-form-controls">including form submission</a>.
    </p>
    <p>
      <a href="https://stackblitz.com/edit/custom-elements-checkbox-group?file=register-custom-elements.js,index.html">Stackblitz Demo</a>
    </p>
  </dd>
</dl>
