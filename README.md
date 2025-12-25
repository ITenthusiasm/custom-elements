# @itenthusiasm/custom-elements

Robust, accessible, and progressively-enhanceable [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) for common developer needs. Each component integrates seamlessly into your web applications, whether you use pure HTML/CSS/JS or you use a JS Framework.

## Install

```
npm install @itenthusiasm/custom-elements
```

## Components

Below are the components that this library currently provides. Each component has its own `README` which you can view to learn more about how the component operates.

<dl>
  <dt id="components-combobox">
    <a href="./src/Combobox"><code>Combobox</code></a>
  </dt>
  <dd>
    <p>
      Progressively enhances the <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select"><code>&lt;select&gt;</code></a> element, transforming it into a stylable, (optionally) filterable <a href="https://www.w3.org/TR/wai-aria-1.2/#combobox"><code>combobox</code></a> which meets WAI-ARIA's <a href="https://www.w3.org/WAI/ARIA/apg/patterns/combobox/">accessibility requirements</a>. The <code>Combobox</code> component behaves just like the native form controls, meaning that it dispatches the standard <code>input</code>/<code>change</code> events, is <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements">associated</a> with its owning form, and automatically participates in all form activity, <a href="https://web.dev/articles/more-capable-form-controls">including form submission</a>.
    </p>
    <p>
      <a href="https://stackblitz.com/edit/custom-elements-combobox?file=index.html,src%2Fmain.ts">Stackblitz Form Integration Demo</a>
    </p>
  </dd>
</dl>
