# Filtering Performance Enhancements (_Advanced_)

Generally speaking, the `Combobox` component's filtering logic should be more performant than many other alternatives out there, especially alternatives which are built on top of JS Frameworks (like `react-select`). This is because the component cleverly handles option filtering without performing aggressive DOM Manipulation (e.g., element removal and re-insertion), and it implements its functionality in CSS whenever [reasonably] possible. Given that many existing alternatives are already "good enough", the same should also be true for this library's `Combobox` component. **_Consequently, you should not need to be concerned about fine-tuned performance in most scenarios._**

However, there may be _some_ rare scenarios where you have to manage and filter an _egregiously large_ number of options (e.g., several thousands of options) &mdash; so many that your users experience performance degradation as they try to filter through your options. Obviously, one solution to this problem is to consider how you could decrease the number of options that must be filtered. For example, you could use multiple separate `Combobox` component instances instead of a single one (_if it made sense_). Alternatively, you could load your options asynchronously as the user types, and put a cap on the number of options that are loaded at once.

Even so, it's possible that neither of these solutions alone are practical and/or sufficient for your needs. If that's the case, we've detailed some techniques below that you can use to enhance the [`ComboboxField`](../combobox-field.md)'s option-filtering speed through [class extension](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) and [method overrides](https://en.wikipedia.org/wiki/Method_overriding). Each technique will require you to override the [`ComboboxField.getFilteredOptions()`](../combobox-field.md#methods-getFilteredOptions) method, which is ultimately responsible for determining how the `Combobox` component's options will be filtered. Its time complexity is `O(n)` (where `n` is the number of `ComboboxOption`s), but this time complexity can be reduced dramatically by applying clever method overrides.

## Understanding the `ComboboxField.getFilteredOptions()` Method

Before overriding the `ComboboxField.getFilteredOptions()` method, it's important to understand how this method works. As described in the [documentation](../combobox-field.md#methods-getFilteredOptions), this method returns an object containing data which the `ComboboxField` uses to update its internal state. This object has two properties: `matchingOptions` and `autoselectableOption`.

### The `matchingOptions` Property

The `matchingOptions` property in the returned object is an _ordered_ list of all `ComboboxOption`s which match the user's current filter. Internally, this list is used by the `ComboboxField` to enable Keyboard Users to navigate between the matching options. The items in the `matchingOptions` list must be ordered in a way that is correspondent to the order of the options in the `ComboboxListbox`. For example, consider the following list of options:

```html
<select-enhancer>
  <combobox-field name="rankings" filter></combobox-field>
  <combobox-listbox>
    <combobox-option>First</combobox-option>
    <combobox-option>Second</combobox-option>
    <combobox-option>Third</combobox-option>
    <combobox-option>Fourth</combobox-option>
    <combobox-option>Fifth</combobox-option>
    <combobox-option>Sixth</combobox-option>
    <combobox-option>Seventh</combobox-option>
  </combobox-listbox>
</select-enhancer>
```

For this list of options, the following `matchingOptions` array would be _invalid_:

```jsx
const matchingOptions = [
  <combobox-option>Seventh</combobox-option>,
  <combobox-option>Second</combobox-option>,
  <combobox-option>Sixth</combobox-option>,
];
```

The array shown above is invalid because the order of the options in the `matchingOptions` list contradicts the order of the options in the `ComboboxListbox`. Specifically, the `ComboboxListbox` in the DOM renders `Seventh` _after_ both `Second` and `Sixth`, whereas the `matchingOptions` array places `Seventh` before those two items.

A _correctly_-ordered list of filtered options would instead look like the following:

```jsx
const matchingOptions = [
  <combobox-option>Second</combobox-option>,
  <combobox-option>Sixth</combobox-option>,
  <combobox-option>Seventh</combobox-option>,
];
```

Here, the order of the `matchingOptions` corresponds to the order of the `ComboboxListbox`'s children, making it a properly-ordered list of matching options.

### The `autoselectableOption` Property

The `autoselectableOption` property in the returned object is the `ComboboxOption` which can be auto-selected. When this property is present on the returned object, the [`ComboboxField.autoselectableOption`](../combobox-field.md#properties-autoselectableOption) property is set to this option. When this property is absent (or `null`), the `ComboboxField.autoselectableOption` property is set to `null`. A nullish `autoselectableOption` implies that no auto-selectable option was found for the user's current filter.

### Side-Effects

The `ComboboxField.getFilteredOptions()` method has one mandatory side-effect: When this method is called, all options that match the user's current filter must have their [`ComboboxOption.filteredOut`](../combobox-option.md#properties-filteredOut) property set to `false`. Similarly, options which don't match the user's current filter must set this property to `true`. This side-effect is mandatory for performance reasons.

Remember that during option filtering, the visibility of each `ComboboxOption` is [toggled with CSS](./styling-the-combobox.md#styling-the-comboboxoptions), _not_ with DOM removal/re-insertion. (This is for JS Framework compatibility purposes, and for performance reasons.) The `ComboboxOption.filteredOut` property is an [accessor](https://www.w3schools.com/js/js_object_accessors.asp) which is responsible for toggling an option's visibility styles. That is why you must always toggle your options' `filteredOut` properties in the `ComboboxField.getFilteredOptions()` method.

To get an idea of how this works, you can look at the [default implementation](../../ComboboxOption.js) of the `ComboboxOption.filteredOut` accessor: It will give an option the `data-filtered-out` attribute when set to `true`, or remove this attribute when set to `false`. Then, in the CSS, a [`[data-filtered-out]` selector](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes) is written to hide the options that have this attribute.

If you prefer to style/mark options as hidden in a different way, you are welcome to override the `ComboboxOption.filteredOut` accessor. Just make sure that your override behaves correctly: Setting the property to `true` should consistently hide the option, whereas setting it to `false` should consistently reveal it.

### Overriding the `ComboboxField.getFilteredOptions()` Method

The time complexity of the `ComboboxField`'s default implementation for `getFilteredOptions()` is `O(n)` because it looks at each option in the `Combobox` component to determine if an option matches the user's current filter. This implementation was chosen because it is sufficient for most use cases, and its simplicity minimizes the library's bundle size.

If you'd prefer a faster implementation, you can override the `getFilteredOptions()` method yourself. However, you must meet the requirements listed above. Namely, your method override must:

1. Return the up-to-date list of options which match the user's current filter. This list belongs on the `matchingOptions` property of the returned object.
2. Order the list of `matchingOptions` in a way that corresponds to the order of the options in the `ComboboxListbox`.
3. Ensure that every `ComboboxOption` which matches the user's current filter sets its `filteredOut` property to `false`, and that every option which _doesn't_ match the user's filter sets this property to `true`.
4. Return the `ComboboxOption` which _exactly_, _case-sensitively_ matches the user's current filter. This `ComboboxOption` belongs on the `autoselectableOption` property of the returned object. If there is no such option (or if the option is disabled or forbidden in some way), the `autoselectableOption` property should be `null | undefined` (or omitted).

> Note: Technically, the 4th rule is not "required" for the `Combobox` component to behave properly. However, satisfying this rule is _recommended_ to produce an intuitive experience for consumers of your component.

> Note: You _may_ choose to set `autoselectableOption` to an option which exactly, **_case-insensitively_** matches the user's current filter. However, if a developer chooses to auto-select such an option for a user, it might cause the `ComboboxField`'s text content to change (e.g., from `the movie` to `The Movie`), thus disrupting the position of the user's cursor (if the `ComboboxField` has focus). If you make `autoselectableOption` case-insensitive, you (and/or your consumers) must ensure that the user's cursor position remains in the correct location during auto-selection. (This is only a concern when auto-selection happens while the user's cursor is in the `ComboboxField`.)

Keep in mind that the base `ComboboxField` class will retain a reference to the `matchingOptions` list that you return. When appropriate, it will mutate this list to guarantee that both the parent class and the child class maintain a valid list of `matchingOptions`. (For example, if the `ComboboxOption`s in the DOM are swapped out, the `ComboboxField` will automatically update the `matchingOptions` list.) This something to be aware of, but it is not anything to be concerned about. In fact, it will produce more predictable behavior for child classes. Thus, you don't need to pass immutable lists to the `matchingOptions` property. Doing so won't break the component's behavior, but doing it for the sake of doing it won't give you any real benefits either.

**WARNING**: The [`ComboboxField.optionMatchesFilter()`](../combobox-field.md#methods-optionMatchesFilter) method is used in the `ComboboxField`'s default implementation of `getFilteredOptions()`. Consequently, overriding `getFilteredOptions()` will render the `optionMatchesFilter()` method useless. And since the behavior of the `ComboboxField`'s [`filtermethod`](../combobox-field.md#attributes-filtermethod) attribute is implemented by `optionMatchesFilter()`, overriding `getFilteredOptions()` will render this attribute useless as well. If your method override doesn't intend to preserve the behavior/purpose of `optionMatchesFilter()` and `filtermethod`, then you should use a [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#deprecated) to mark both the method and the [`ComboboxField.filterMethod`](../combobox-field.md#properties-filterMethod) accessor as deprecated.

<hr />

Now you know how the `ComboboxField.getFilteredOptions()` method works, and what the requirements are for overriding it. Next, you need to determine _how_ you want to override this method to improve performance. To help you get started, we've provided some examples below on how to approach this. Here's our recommendation: If you're looking to improve the performance of _synchronous_ option filtering, see [_Filtering Options with `Trie`s_](#filtering-options-with-tries). <!-- If you want better performance while loading options _asynchronously_, see [_Skipping Redundant Actions during Async Loading_](#skipping-redundant-actions-during-async-loading). TODO: This section of the article won't actually be relevant until the RFC for Overriding the `ComboboxField`'s Option Resetting Logic is addressed. -->

## Filtering Options with `Trie`s

> **NOTE**: This section assumes that you have a sufficient understanding of how the `ComboboxField.getFilteredOptions()` method works and how to override it (as detailed at the beginning of this document). It also assumes you have a basic understanding of the [`Trie`](https://en.wikipedia.org/wiki/Trie) and [`ArrayList`](https://en.wikipedia.org/wiki/Dynamic_array) data structures.
>
> If you are unfamiliar with these data structures, see ThePrimeagen's Free Course on [Data Structures and Algorithms](https://frontendmasters.com/courses/algorithms/) first. (Note that if you're unfamiliar with these data structures, you probably _don't_ need this section's performance enhancement. Either that, or this is the very first time you've needed to reduce an autocomplete's time complexity below `O(n)`.)

The limitation with `ArrayList`s (which are used for [`Array`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) in JS) is that they don't give you any indication of which items in the list match the user's filter. For example, if you know that the user's current filter is `ap`, an `ArrayList` cannot immediately tell you which indices point to options matching this filter. Instead, you must visit each item in the list, one at a time, to determine which options are filtered in and which ones are filtered out, resulting in `O(n)` time complexity (where `n` is the number of options). In most cases, this time complexity is not a problem. However, for a _significantly large_ number of options (e.g., several thousands of options), it can result in a slower UX.

By contrast, `Trie`s are able to tell you which items (i.e., nodes) match the user's current filter with ease. If you are performing a Pre-order Traversal of a `Trie`'s nodes in your `Trie.search()` algorithm, **_then you will only visit the options which match user's current filter_**, and you will extract these options in alphabetical order.

### Storing `ComboboxOption`s in a `Trie`

To get an idea of how you would use a `Trie` to improve option filtering, imagine that you have mounted a `Combobox` component with a list of options:

```html
<select-enhancer>
  <combobox-field name="rankings" filter></combobox-field>
  <combobox-listbox>
    <combobox-option value="1">First</combobox-option>
    <combobox-option value="2">Second</combobox-option>
    <combobox-option value="3">Third</combobox-option>
    <!-- Other Options ... -->
  </combobox-listbox>
</select-enhancer>
```

When the component is connected to the DOM, you can instantiate a new `Trie` and insert all of the component's options into it. Each node in this `Trie` would be a lowercase letter (or an entity representing a lowercase letter). Lowercase letters are used to support case-insensitive option filtering; so `First` would be inserted into the `Trie` as `first`. Note that we insert the options' _`label`s_ into the `Trie`, not their `value`s.

Any node in the `Trie` representing a `ComboboxOption`'s _completed_ label would be given an `option` property which points to the `ComboboxOption` owning the label. For example, when `First` is inserted into the `Trie` as `first`, the last letter (`t` in this case) _completes_ the option's label. Thus, the node representing this letter should be given an `option` property that references the original `ComboboxOption`.

With this `Trie` design, you should be able to retrieve an alphabetically-ordered list of all matching options in approximately `O(1)` time by calling the `Trie.search()` method with the user's filter. (If you want to be a stickler, the time complexity is _technically_ approximately `O(h)`, where `h` is the length of the longest word/phrase in your list of options. But practically speaking, `h` is going to be a small constant because your words/phrases can only be so long, so the time complexity is still roughly `O(1)`.) That's much faster than the `O(n)` time for an `ArrayList` data structure!

Note that in this guide, we will not dive deeply into the details of how to implement a `Trie` in JS. However, to get you started, we've provided a shell of what an implementation may look like below:

```js
/** A `Trie` implementation for storing and easily retrieving the `option`s belonging to a `combobox`. */
class ComboboxOptionTrie {
  #tree = Array(26); // If you don't know why `Array(26)` is used here, refer to ThePrimeagen's algorithms course.

  /**
   * Inserts the provided `combobox` `option` into the `Trie`
   * @param {ComboboxOption} option
   * @returns {void}
   */
  insert(option) {
    for (const letter of option.label.toLowerCase()) {
      // On an as-needed basis, add nodes into the `#tree` which represent each letter.
      // When on the last letter/node, add a property to the node which points to the `option` argument.
    }
  }

  /**
   * Deletes the provided `combobox` `option` from the `Trie`
   * @param {ComboboxOption} option
   * @returns {void}
   */
  delete(option) {
    // Use `option.label.toLowerCase()` to get the path to the stored option within the `#tree`.
    // Next, use recursion to delete all obsolete nodes.
  }

  /**
   * @param {string} filter The user's current filter.
   * @returns {ComboboxOption[]} The list of `combobox` `option`s which match the user's filter, in alphabetical order.
   */
  search(filter) {
    const normalizedFilter = filter.toLowerCase();
    /* Implementation using Pre-Order Traversal of `#tree` ... */
  }
}
```

> If you want more help understanding `Trie`s, we again recommend seeing ThePrimeagen's brief [`Trie` Lesson](https://frontendmasters.com/courses/algorithms/tries/). If you are unfamiliar with Depth-first Search algorithms for `Tree`s (such as the Pre-order Traversal), see his [Lessons on `Tree`s](https://frontendmasters.com/courses/algorithms/trees-overview/). (Yes, the spelling for both links is correct. A `Trie` is a type of `Tree`.)

Note that if you want to store additional characters in the `Trie` (such as the empty space character), you are welcome to do so. However, you'll want to store these characters in such a way that your options are still retrieved in alphabetical order when `Trie.search()` is called. ([`String.charCodeAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt) might be helpful for you here.)

As we mentioned earlier, this `Trie` will be initialized when the `Combobox` component is mounted to the DOM. We can accomplish this by extending the `ComboboxField`'s `connectedCallback()` lifecycle method:

```js
import { ComboboxField } from "@itenthusiasm/custom-elements/Combobox";
import ComboboxOptionTrie from "./ComboboxOptionTrie.js";

class TrieComboboxField extends ComboboxField {
  #trie = new ComboboxOptionTrie();

  connectedCallback() {
    for (const option of this.listbox.children) this.#trie.insert(option);
    super.connectedCallback();
  }
}
```

### Using the `Trie` to Filter `ComboboxOption`s

Once you've implemented the `Trie`, the process for filtering `ComboboxOption`s using the `Trie` is fairly straightforward. First, we'll need to override the `getFilteredOptions()` method:

```js
/** @import { ComboboxOption, GetFilteredOptionsReturnType } from "@itenthusiasm/custom-elements/Combobox" */
import { ComboboxField } from "@itenthusiasm/custom-elements/Combobox";
import ComboboxOptionTrie from "./ComboboxOptionTrie.js";

class TrieComboboxField extends ComboboxField {
  /** @type {ComboboxOption[]} */
  #matchingOptions = [];
  #trie = new ComboboxOptionTrie();

  connectedCallback() {
    for (const option of this.listbox.children) this.#trie.insert(option);
    super.connectedCallback();
  }

  /** @returns {GetFilteredOptionsReturnType} */
  getFilteredOptions() {
    // Clear the previously-matching options
    this.#matchingOptions.forEach((o) => (o.filteredOut = true));

    // Obtain the new matching options
    const search = this.text.data;
    this.#matchingOptions = this.#trie.search(search);
    this.#matchingOptions.forEach((o) => (o.filteredOut = false));

    // Determine the `autoselectableOption`. For a Pre-order-Traversed `Trie`, this can only be the first option.
    const firstOption = this.#matchingOptions.at(0);
    const autoselectableOption = search === firstOption?.label && !firstOption.disabled ? firstOption : null;

    return { matchingOptions: this.#matchingOptions, autoselectableOption };
  }
}
```

As shown above, we start by marking the options from the user's _previous_ filter as filtered out (because the new filter makes the previous list of matching options outdated/obsolete). Next, we use the `Trie` to retrieve the list of options which match the user's _current_ filter. We mark these options as filtered in before returning them. We also return the `autoselectableOption` if it exists.

Note that the time complexity of this method is approximately `O(1)`. If you want to be a stickler, it's technically approximately `O(3h)`. One `h` is for marking the previously-matching options as filtered out. Another `h` is for calling `Trie.search()`. And the last `h` is for marking the newly-retrieved options as filtered in. However, as we mentioned previously, `h` is practically going to be so small that it's effectively a constant. So the real time complexity is approximately `O(3C)`, which is always reduced to approximately `O(1)`.

#### Additional Filtering Optimizations

If you are willing to mutate your state aggressively for performance, there are additional optimizations you could make. For example, you could update `Trie.search()` to mark `ComboboxOption.filteredOut` as `false` whenever a new option is added to the list of returned results. This would reduce the time complexity of `getFilteredOptions()` from `O(3h)` to `O(2h)`. However, you're just reducing the complexity from one constant time function to another constant time function. So you should ask yourself if putting a side-effect in `Trie.search()` is really worth it.

Another optimization that you could make is with respect to memory. The implementation above creates a new array every every time `Trie.search()` is called. But we can skip this memory overhead if we only use a single array and mutate it whenever the `matchingOptions` need to be changed.

```js
class ComboboxOptionTrie {
  #matchingOptions = [];
  #tree = Array(26);

  /**
   * @param {string} filter The user's current filter.
   * @returns {ComboboxOption[]} The list of `combobox` `option`s which match the user's filter, in alphabetical order.
   */
  search(filter) {
    this.#matchingOptions.forEach((o) => (o.filteredOut = true));

    const normalizedFilter = filter.toLowerCase();
    /*
     * - Implementation using Pre-Order Traversal of `#tree`, mutating `#matchingOptions` along the way. ...
     * - Also, set any newly-matching `ComboboxOption`'s `filteredOut` property to `false`.
     */
    return this.#matchingOptions;
  }

  // Optionally, expose `matchingOptions` to `ComboboxField` if necessary
  get matchingOptions() {
    return this.#matchingOptions;
  }
}
```

This is technically more efficient. But again, you're optimizing `O(1)` time complexity, so consider how much this is actually worthwhile.

One last note before moving on: When the user's filter is emptied, you'll need to mark all of the available options as filtered in. You can do this in the `Trie.search()` method or in the `ComboboxField.getFilteredOptions()` method. (We know that this will result in a nasty `O(n)` operation. However, this operation will only occur when the user changes their filter from non-empty to empty, or vice-versa. If you find this requirement problematic, please engage the [RFC for additional `ComboboxField` performance improvements](https://github.com/ITenthusiasm/custom-elements/issues/1). We are interested in resolving this limitation if others genuinely need it resolved.)

### Using the Correct CSS Styles

The last thing that we'll need to do is update the implementation of the `ComboboxOption.filteredOut` accessor. Recall that this property is responsible for updating a `ComboboxOption`'s styles such that it is hidden when filtered out and revealed when filtered in. With our `Trie`-based implementation, we never have access to the full list of filtered-out options. Rather, we only have access to the list of options which matched the user's previous filter, and the list of options which match the user's current filter. So we'll need to override the `ComboboxOption.filteredOut` accessor to take this into account.

In this case, we'll need to override the `ComboboxOption.filteredOut` accessor so that options are _always_ filtered out unless we _explicitly_ mark them as filtered in. (This is the opposite of the default implementation of the accessor, which assumes that all options are filtered in unless they are explicitly marked as filtered out.)

```js
import { ComboboxOption } from "@itenthusiasm/custom-elements/Combobox";

/** A {@link ComboboxOption} whose {@link filteredOut} accessor assumes that options are filtered out by default. */
class AltComboboxOption extends ComboboxOption {
  /** @returns {boolean} */
  get filteredOut() {
    return !this.hasAttribute("data-filtered-in");
  }

  set filteredOut(value) {
    this.toggleAttribute("data-filtered-in", !value);
  }
}
```

We'll also need to update the [CSS for the `ComboboxOption`s](./styling-the-combobox.md#styling-the-comboboxoptions) to reflect this change:

```css
select-enhancer {
  & > [role="combobox"] {
    & + [role="listbox"] {
      & > [role="option"] {
        /* `ComboboxOption` Styles */
        /* ... */
        /* Hide options by default */
        display: none;
        visibility: hidden;

        &[data-filtered-in] {
          /* Reveal filtered-in options */
          display: block;
          visibility: visible;
        }
      }
    }
  }
}
```

### Caveats

There are a few caveats to be aware of when using this approach.

#### 1&rpar; The Ordered `matchingOptions` Rule Still Applies

It's important to remember that, as was stated earlier, the order of the `matchingOptions` returned by `getFilteredOptions()` must correspond to the order of the component's options in the DOM. Since our `Trie` always returns a list of options in case-insensitive alphabetical order when performing a Pre-order Traversal, this means that **_the `ComboboxOption`s must be rendered to the DOM in case-insensitive alphabetical order_**.

Typically, your options will be fetched from the backend in some way (whether during Server Side Rendering or after Client Side Rendering). So you can just sort your options on the backend when they're fetched (e.g., in your [`SQL` query](https://stackoverflow.com/questions/2413427/how-to-use-sql-order-by-statement-to-sort-results-case-insensitive)). That way, your frontend only has to render the `ComboboxOption`s to the DOM (without sorting them) since they've already been sorted on the server.

#### 2&rpar; Dynamically Replacing Options Requires `Trie` Updates

If for any reason you decide to switch out the `ComboboxOption`s that were originally rendered to the DOM, your `ComboboxField`'s local `#trie` will become outdated. To resolve this issue, you'll need to update your `#trie` whenever the `ComboboxOption`s are changed.

```js
/** @import { ComboboxOption, GetFilteredOptionsReturnType } from "@itenthusiasm/custom-elements/Combobox" */
import { ComboboxField } from "@itenthusiasm/custom-elements/Combobox";
import ComboboxOptionTrie from "./ComboboxOptionTrie.js";

class TrieComboboxField extends ComboboxField {
  /** @type {ComboboxOption[]} */
  #matchingOptions = [];
  #trie = new ComboboxOptionTrie();

  connectedCallback() {
    for (const option of this.listbox.children) this.#trie.insert(option);
    this.#optionsObserver.observe(this.listbox, { childList: true });
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.#optionsObserver.disconnect();
    super.disconnectedCallback();
  }

  #optionsObserver = new MutationObserver(() => {
    this.#trie = new ComboboxOptionTrie();
    for (const option of this.listbox.children) this.#trie.insert(option);
  });
}
```

If you prefer to add/remove options from the `Trie` individually, you can look at the [`addedNodes`](https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord/addedNodes) and [`removedNodes`](https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord/removedNodes) of each mutation in the callback's `mutationList`. (The `mutationList` argument was omitted in the callback shown above.) In that case, you could choose to leverage `Trie.delete()` alongside `Trie.insert()`, and choose to only call these methods when an option isn't currently in the DOM. Visit [MDN's documentation](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to learn more about `MutationObserver`s.

Note that practically speaking, if you're looking to use a `Trie` because you're managing an _enormous_ list of options, you probably don't want to be swapping out your `ComboboxOption`s in the DOM too frequently (if at all) anyway. Doing so would likely harm performance.

### Limitations

The one limitation with the `ComboboxField`'s performance enhancement capabilities is Option Resetting. Option Resetting is the process where all `ComboboxOption`s are marked as filtered in (`ComboboxOption.filteredOut = false`) and are inserted into the internal `matchingOptions` list in proper order. This occurs when the user collpases the `combobox`, or when the developer swaps out some of the `ComboboboxOption`s in the DOM while the `combobox` is collapsed.

Option Resetting is an `O(n)` procedure, and the logic for this procedure cannot be overridden. However, it is possible for the maintainers of this library to add the ability to override this behavior so that it can have a time complexity of `O(1)`. The path to accomplishing this is straightforward, but we are requesting developer feedback before pursuing it to see if there is a genuine need. See GitHub Issue ITenthusiasm/custom-elements#1 for more details.

<!--
...

TODO: Soon after we started working on this part of the guide, we realized that managing async options is kind of already at its peek possible performance. This is not a limitation of the `ComboboxField`; it's a limitation of what's practically doable with HTML/JS/CSS. The **_only_** additional optimization that could be performed is overriding the Option Resetting logic to return the current list of `matchingOptions` (since no real option resetting needs to occur). But this is not possible as of today, and it would probably be a micro-optimization -- all things considered. So... before doing any further work on this section, address the RFC that we made regarding Overriding the `ComboboxField`'s Option Resetting Logic.

## Skipping Redundant Actions during Async Loading

> **NOTE**: This section assumes that you have a sufficient understanding of how the `ComboboxField.getFilteredOptions()` method works and how to override it (as detailed at the beginning of this document). It also assumes that you already know how to [load `ComboboxOption`s asynchronously](./loading-options-asynchronously.md). Please familiarize yourself with these concepts before proceeding.

```js
/** @import { ComboboxOption, GetFilteredOptionsReturnType } from "@itenthusiasm/custom-elements/Combobox" */
import { ComboboxField } from "@itenthusiasm/custom-elements/Combobox";

class AsyncComboboxField extends ComboboxField {
  /** @type {ComboboxOption[]} */
  #matchingOptions = [];

  /** @returns {GetFilteredOptionsReturnType} */
  getFilteredOptions() {
    const matchingOptions = this.#matchingOptions;
    const autoselectableOption = matchingOptions.find((o) => o.label === this.text.data && !o.disabled);

    return { matchingOptions, autoselectableOption };
  }
}
```

The above implementation incurs an `O(n)` time complexity cost by looping over the `matchingOptions` to find the `autoselectableOption`. You can reduce the time complexity to `O(1)` by neglecting/omitting the `autoselectableOption` property. Alternatively, you can mark the `autoselectableOption` before it is returned from the server so that you can access it directly on the client's side. This would also give you `O(1)` performance. If you decide to neglect the `autoselectableOption` property altogether, then you should mark the [`ComboboxField.autoselectableOption`](../combobox-field.md#properties-autoselectableOption) getter as deprecatd with a [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#deprecated).

The reason that this approach works is that...

...
-->
