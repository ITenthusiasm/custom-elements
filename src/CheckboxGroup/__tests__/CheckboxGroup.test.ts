/* eslint-disable guard-for-in */
/* eslint-disable no-void */
/* eslint-disable prefer-template */
import { test as it, expect as baseExpect } from "@playwright/test";
import type { Page, Locator, MatcherReturnType, Dialog } from "@playwright/test";
import type CheckboxGroup from "../CheckboxGroup.js";
import type {} from "../types/dom.d.ts";

/* ---------------------------------------- Custom Assertions ---------------------------------------- */
const expect = baseExpect.extend({
  async toHaveCustomValue(
    element: Locator,
    expected: Readonly<CheckboxGroup["value"]>,
    options?: {
      timeout?: number;
      /**
       * When `true`, additionally asserts that the Custom Element has an owning `<form>` element whose
       * `FormData` includes the Custom Element's value. Requires the Custom Element to have a valid `name`.
       *
       * **Note**: An empty array `value` implies a `null` {@link FormData} value. | EDIT: Maybe not?
       */
      form?: boolean;
    },
  ) {
    const name = "toHaveCustomValue";
    const timeout = options?.timeout ?? this.timeout;

    try {
      const valueExpectation = this.isNot ? baseExpect(element).not : baseExpect(element);
      await valueExpectation.toHaveJSProperty("value", expected, { timeout });
    } catch (error) {
      const { matcherResult } = error as { matcherResult: MatcherReturnType };
      return { ...matcherResult, name, pass: this.isNot, message: () => String(matcherResult.message) };
    }

    const formInfo = !options?.form
      ? null
      : await element.evaluate(
          (node: CheckboxGroup) => {
            if (!node.form) return { hasForm: false, formValue: null };
            return { hasForm: true, formValue: new FormData(node.form).getAll(node.name) };
          },
          undefined,
          { timeout },
        );

    if (options?.form) {
      if (!formInfo?.hasForm) {
        return {
          name,
          pass: this.isNot,
          message: () =>
            this.utils.matcherHint(name, "locator", "expected", { isNot: this.isNot, promise: this.promise }) +
            "\n\n" +
            `Locator: ${element}\n` +
            `Expected: ${element} to have an owning <form> element\n`,
        };
      }

      try {
        const formValueExpectation = this.isNot ? baseExpect(formInfo.formValue).not : baseExpect(formInfo.formValue);
        formValueExpectation.toStrictEqual(expected);
      } catch (error) {
        const { matcherResult } = error as { matcherResult: MatcherReturnType };
        const not = this.isNot ? " not" : "";

        return {
          ...matcherResult,
          name,
          pass: this.isNot,
          message: () =>
            this.utils.matcherHint(name, "locator", "expected", { isNot: this.isNot, promise: this.promise }) +
            "\n\n" +
            `Locator: ${element}\n` +
            `Expected: ${element}${not} to have associated form value ${this.utils.printExpected(expected)}\n` +
            `Received: ${this.utils.printReceived(matcherResult.actual)}`,
        };
      }
    }

    // Error Messaging is handled by all of the earlier logic, so an empty string is fine here.
    return { name, pass: !this.isNot, message: () => "" };
  },
});

/* ---------------------------------------- Miscellaneous Helpers ---------------------------------------- */
/**
 * Renders the provided HTML template string to the provided `page`, replacing all of the contents
 * of the `body` on that page.
 *
 * @example
 * renderHTMLToPage(page)`
 *   <div>Hello</div>
 *   <div>World</div>
 * `;
 */
function renderHTMLToPage(page: Page) {
  return function html(strings: TemplateStringsArray, ...values: string[]): Promise<void> {
    const markup = String.raw({ raw: strings }, ...values);
    return page.evaluate((template) => void (document.body.innerHTML = template), markup);
  };
}

/**
 * Creates the HTML for a new checkbox from the provided options.
 *
 * For simplicity, the returned element layout is: `input + label`
 * @param options
 */
function createCheckbox(options: {
  name: string;
  value: string;
  /** Defaults to {@link options.name}, capitalized */
  label?: string;
  /** Whether or not the checkbox will be {@link HTMLInputElement.defaultChecked} */
  checked?: boolean;
}): string {
  const { name, value } = options;
  const label = options.label ?? `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  const checked = options.checked ? "checked" : "";

  return `
    <input id="${value}" name="${name}" type="checkbox" value="${value}" ${checked} />
    <label for="${value}">${label}</label>
  `;
}

/**
 * Generates a helper function which tracks the number of times that an event of the specified `type`
 * is dispatched by the provided `target` element.
 *
 * @param target May be a {@link Page} or a {@link Locator}. If `target` is a `Locator`, then events will
 * only be counted if the event's target is the same element as the provided `target`. If `target` is a
 * `Page`, then all events of the specified `type` will be tracked, irrespective of the event's target,
 * and the event listener will be attached to the `Page`'s `Document`.
 * @param type The type of DOM event to listen for.
 * @param options A mixture of {@link EventListenerOptions} and some extra options specific to Playwright.
 */
async function createDOMEventWaiter<T extends keyof DocumentEventMap, E extends DocumentEventMap[T]>(
  target: Page | Locator,
  type: T,
  options?: EventListenerOptions & {
    /** The **_constructor name_** of the event that you're expecting (e.g., `InputEvent`, `Event`, etc.). */
    event?: string;
    /**
     * Indicates that the tracking event handler should be attached to the `Document` even if
     * `target` is a `Locator`.
     */
    document?: boolean;
    timeout?: number;
  },
) {
  const events: E[] = [];
  const page = "page" in target ? target.page() : target;
  await page.exposeFunction(`push${type}event`, (e: unknown) => events.push(e as E));

  /** The timer related to {@link waitForDOMEvent}'s `Promise` rejection callback */
  let timer: NodeJS.Timeout | undefined;
  let resolve: Parameters<ConstructorParameters<typeof Promise<E[]>>[0]>[0];

  let i = 0;
  let exposedResolverNameUnavailable = true;
  let exposedResolverName: `callNodeResolve${number | ""}` = "callNodeResolve";

  while (exposedResolverNameUnavailable) {
    const nameTaken = await page.evaluate((name) => name in window, exposedResolverName);
    if (nameTaken) exposedResolverName = `callNodeResolve${++i}`;
    else exposedResolverNameUnavailable = false;
  }

  await page.exposeFunction(exposedResolverName, () => {
    clearTimeout(timer);
    resolve(events);
  });

  const locatorUsed = "page" in target;
  const locator = "page" in target ? target : page.locator("body");

  // Setup tracking event handler
  await locator.evaluate(
    (node, [t, lu, opts, resolverName]) => {
      const constructor = opts?.event;
      const nodeWithListener = !lu || opts?.document ? document : node;
      nodeWithListener.addEventListener(t, handleEvent, opts);

      function handleEvent(evt: Event) {
        if (constructor && !eval(`evt.constructor === ${constructor}`)) return;
        if (lu && evt.target !== node) return;

        const props: Record<string, unknown> = { constructor };
        for (const key in evt) props[key] = evt[key as keyof typeof evt];
        (window as any)[`push${t}event`](props); // eslint-disable-line @typescript-eslint/no-explicit-any
        (window as any)[resolverName](); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    },
    [type, locatorUsed, options, exposedResolverName] as const,
  );

  return waitForDOMEvent;
  async function waitForDOMEvent(): Promise<typeof events> {
    return new Promise((res, reject) => {
      resolve = res;
      const timeout = options?.timeout || 2000;
      timer = setTimeout(reject, timeout, new Error(`Timed out ${timeout}ms waiting for event ${type}.`));
    });
  }
}

/**
 * Generates a helper function which tracks the number of times that a `pageerror` event occurs on the provided `page`.
 * @param page
 * @param options
 */
function createErrorWatcher(page: Page, options?: { timeout?: number }) {
  /** The timer related to {@link waitForNextError}'s `Promise` rejection callback */
  let timer: NodeJS.Timeout | undefined;
  let resolve: Parameters<ConstructorParameters<typeof Promise<typeof errors>>[0]>[0];

  page.on("pageerror", pushErrors);
  page.on("close", () => page.off("pageerror", pushErrors));

  const errors: Error[] = [];
  function pushErrors(error: Error) {
    clearTimeout(timer);
    errors.push(error);
    resolve(errors);
  }

  return waitForNextError;
  function waitForNextError(): Promise<typeof errors> {
    return new Promise((res, reject) => {
      resolve = res;
      const timeout = options?.timeout || 2000;
      timer = setTimeout(reject, timeout, new Error(`Timed out ${timeout}ms waiting for a \`pageerror\` to occur.`));
    });
  }
}

/* ---------------------------------------- Tests ---------------------------------------- */
it.describe("Checkbox Group Web Component", () => {
  const url = "http://localhost:5173";

  it.describe("Value and Form State Synchronization", () => {
    it("Mounts with the correct state", async ({ page }) => {
      // With no checkboxes
      await page.goto(url);
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset></fieldset>
          </checkbox-group>
        </form>
      `;

      const group = page.getByRole("group");
      await expect(group).toHaveCustomValue([], { form: true });

      // With no _selected_ checkboxes
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
              ${createCheckbox({ name: "subjects", value: "science" })}
              ${createCheckbox({ name: "subjects", value: "english" })}
            </fieldset>
          </checkbox-group>
        </form>
      `;

      await expect(group).toHaveCustomValue([], { form: true });

      // With 1 selected checkbox
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
              ${createCheckbox({ name: "subjects", value: "science", checked: true })}
              ${createCheckbox({ name: "subjects", value: "english" })}
            </fieldset>
          </checkbox-group>
        </form>
      `;

      await expect(group).toHaveCustomValue(["science"], { form: true });

      // With multiple selected checkboxes
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
              ${createCheckbox({ name: "subjects", value: "science", checked: true })}
              ${createCheckbox({ name: "subjects", value: "english", checked: true })}
            </fieldset>
          </checkbox-group>
        </form>
      `;

      await expect(group).toHaveCustomValue(["science", "english"], { form: true });
    });

    it("Correctly updates its state in response to user interactions", async ({ page }) => {
      /* ---------- Setup ---------- */
      await page.goto(url);
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
              ${createCheckbox({ name: "subjects", value: "science", checked: true })}
              ${createCheckbox({ name: "subjects", value: "english" })}
            </fieldset>
          </checkbox-group>
        </form>
      `;

      /* ---------- Assertions ---------- */
      const group = page.getByRole("group");
      const checkboxes = page.getByRole("checkbox");

      // Deselect middle checkbox
      await checkboxes.nth(1).click();
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(group).toHaveCustomValue([], { form: true });

      // Select first and last checkboxes
      await checkboxes.last().click(); // Mouse Interactions
      await expect(checkboxes.last()).toBeChecked();

      await checkboxes.first().press(" "); // Keyboard Interactions
      await expect(checkboxes.first()).toBeChecked();
      await expect(group).toHaveCustomValue(["english", "math"], { form: true });
    });

    it("Correctly updates its state in response to DOM Node insertion/removal", async ({ page }) => {
      /* ---------- Setup ---------- */
      const name = "subject";
      await page.goto(url);
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset>
              ${createCheckbox({ name, value: "physics", checked: true })}
              ${createCheckbox({ name, value: "history" })}
            </fieldset>
          </checkbox-group>
        </form>
      `;

      /* ---------- Assertions ---------- */
      // Add a new, `defaultChecked` checkbox
      const group = page.getByRole("group");
      const fieldset = group.locator("fieldset");
      const mathHTML = createCheckbox({ name, value: "math", checked: true });
      await fieldset.evaluate((node, html) => node.insertAdjacentHTML("afterbegin", html), mathHTML);
      await expect(group).toHaveCustomValue(["physics", "math"], { form: true });

      // Add a new `checked`, non-`defaultChecked` checkbox
      await fieldset.evaluate((node, n) => {
        const value = "art";

        const checkbox = document.createElement("input");
        type InputProps = Partial<HTMLInputElement>;
        const props: InputProps = { id: value, name: n, type: "checkbox", value, checked: true, defaultChecked: false };
        Object.assign(checkbox, props);

        const label = document.createElement("label");
        type LabelProps = Partial<HTMLLabelElement>;
        const props2: LabelProps = { htmlFor: value, textContent: `${value.charAt(0).toUpperCase()}${value.slice(1)}` };
        Object.assign(label, props2);

        node.append(checkbox, label);
      }, name);

      await expect(group).toHaveCustomValue(["physics", "math", "art"], { form: true });

      // Remove a `defaultChecked` item which is still checked
      const physicsCheckbox = page.getByRole("checkbox", { name: "Physics" });
      await expect(physicsCheckbox).toHaveJSProperty("defaultChecked", true);
      await expect(physicsCheckbox).toHaveJSProperty("checked", true);
      await physicsCheckbox.evaluate((node: HTMLInputElement) => {
        node.labels?.forEach((l) => l.remove());
        node.remove();
      });

      await expect(group).toHaveCustomValue(["math", "art"], { form: true });

      // Remove a `checked`, non-`defaultChecked` item
      const artCheckbox = page.getByRole("checkbox", { name: "Art" });
      await expect(artCheckbox).toHaveJSProperty("defaultChecked", false);
      await expect(artCheckbox).toHaveJSProperty("checked", true);
      await artCheckbox.evaluate((node: HTMLInputElement) => {
        node.labels?.forEach((l) => l.remove());
        node.remove();
      });

      await expect(group).toHaveCustomValue(["math"], { form: true });

      // Add an unchecked checkbox (no change)
      const chemistryHTML = createCheckbox({ name, value: "chemistry" });
      await fieldset.evaluate((node, html) => node.insertAdjacentHTML("afterbegin", html), chemistryHTML);
      await expect(group).toHaveCustomValue(["math"], { form: true });

      // Remove an unchecked checkbox (no change)
      const historyCheckbox = page.getByRole("checkbox", { name: "History" });
      await expect(historyCheckbox).toHaveJSProperty("checked", false);
      await historyCheckbox.evaluate((node: HTMLInputElement) => {
        node.labels?.forEach((l) => l.remove());
        node.remove();
      });

      await expect(group).toHaveCustomValue(["math"], { form: true });

      // Remove an unchecked, `defaultChecked` checkbox (no change)
      const diffEQHTML = createCheckbox({ name, value: "diffeq", label: "Diff EQ", checked: true });
      await fieldset.evaluate((node, html) => node.insertAdjacentHTML("afterbegin", html), diffEQHTML);
      await expect(group).toHaveCustomValue(["math", "diffeq"], { form: true });

      const diffEQCheckbox = page.getByRole("checkbox", { name: "Diff EQ" });
      await diffEQCheckbox.click();
      await expect(diffEQCheckbox).toHaveJSProperty("checked", false);
      await expect(diffEQCheckbox).toHaveJSProperty("defaultChecked", true);
      await expect(group).toHaveCustomValue(["math"], { form: true });

      await diffEQCheckbox.evaluate((node: HTMLInputElement) => {
        node.labels?.forEach((l) => l.remove());
        node.remove();
      });

      await expect(group).toHaveCustomValue(["math"], { form: true });
    });

    it("Correctly updates its state in response to `value` property updates", async ({ page }) => {
      // NOTE: Order will be based on DOM in this case, not order of values
      /* ---------- Setup ---------- */
      await page.goto(url);
      await renderHTMLToPage(page)`
        <form aria-label="Test Form">
          <checkbox-group name="subjects">
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
              ${createCheckbox({ name: "subjects", value: "science" })}
              ${createCheckbox({ name: "subjects", value: "english" })}
            </fieldset>
          </checkbox-group>
        </form>
      `;

      /* ---------- Assertions ---------- */
      // Setting multiple values
      const group = page.getByRole("group");
      await group.evaluate((node: CheckboxGroup) => (node.value = ["science", "math"]));
      await expect(group).toHaveCustomValue(["math", "science"], { form: true });

      const checkboxes = page.getByRole("checkbox");
      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).toBeChecked();
      await expect(checkboxes.nth(2)).not.toBeChecked();

      // Setting a single value
      await group.evaluate((node: CheckboxGroup) => (node.value = ["english"]));
      await expect(group).toHaveCustomValue(["english"], { form: true });

      await expect(checkboxes.nth(0)).not.toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(checkboxes.nth(2)).toBeChecked();

      // Clearing the value
      await group.evaluate((node: CheckboxGroup) => (node.value = []));
      await expect(group).toHaveCustomValue([], { form: true });

      await expect(checkboxes.nth(0)).not.toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(checkboxes.nth(2)).not.toBeChecked();

      // Setting partially invalid values
      await group.evaluate((node: CheckboxGroup) => (node.value = ["math", String(Math.random()), "english"]));
      await expect(group).toHaveCustomValue(["math", "english"], { form: true });

      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(checkboxes.nth(2)).toBeChecked();

      // Setting duplicate values
      await group.evaluate((node: CheckboxGroup) => (node.value = ["english", "math", "math", "english"]));
      await expect(group).toHaveCustomValue(["math", "english"], { form: true });

      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(checkboxes.nth(2)).toBeChecked();

      // Setting all invalid values
      await group.evaluate((node: CheckboxGroup) => (node.value = [String(Math.random()), String(Math.random())]));
      await expect(group).toHaveCustomValue([], { form: true });

      await expect(checkboxes.nth(0)).not.toBeChecked();
      await expect(checkboxes.nth(1)).not.toBeChecked();
      await expect(checkboxes.nth(2)).not.toBeChecked();
    });
  });

  it.describe("API", () => {
    it.describe("Exposed Properties and Attributes", () => {
      it.describe("value (Property)", () => {
        it("Exposes the `value` of the `group`", async ({ page }) => {
          // Setup
          const name = "my-checkbox-group";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <form aria-label="Test Form">
              <checkbox-group name="${name}">
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            </form>
          `;

          // Assertions
          const group = page.getByRole("group");
          const checkboxes = group.locator("fieldset").getByRole("checkbox");
          await expect(group).toHaveCustomValue([], { form: true });

          await checkboxes.last().click();
          await expect(checkboxes.last()).toBeChecked();
          await expect(group).toHaveCustomValue(["english"], { form: true });

          await checkboxes.first().press(" ");
          await expect(checkboxes.first()).toBeChecked();
          await expect(group).toHaveCustomValue(["english", "math"], { form: true });
        });

        it("Updates the `value` of the `group`, including `checkbox`es and validity state", async ({ page }) => {
          // Setup
          const name = "my-checkbox-group";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <form aria-label="Test Form">
              <checkbox-group name="${name}" min="2">
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science", checked: true })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            </form>
          `;

          // Assertions
          const group = page.getByRole("group");
          const checkboxes = group.locator("fieldset").getByRole("checkbox");

          await expect(checkboxes.nth(0)).not.toBeChecked();
          await expect(checkboxes.nth(1)).toBeChecked();
          await expect(checkboxes.nth(2)).not.toBeChecked();
          await expect(group).toHaveCustomValue(["science"], { form: true });
          expect(await group.evaluate((node: CheckboxGroup) => node.validity.valid)).toBe(false);

          // Manually Make Field Valid
          const userValue = ["english", "math"];
          await group.evaluate((node: CheckboxGroup, value) => (node.value = value), userValue);
          await expect(checkboxes.nth(0)).toBeChecked();
          await expect(checkboxes.nth(1)).not.toBeChecked();
          await expect(checkboxes.nth(2)).toBeChecked();
          await expect(group).toHaveCustomValue(["math", "english"], { form: true });
          expect(await group.evaluate((node: CheckboxGroup) => node.checkValidity())).toBe(true);

          // Manually Make Field Invalid
          expect(await group.evaluate((node: CheckboxGroup) => (node.value = [])));
          await expect(checkboxes.nth(0)).not.toBeChecked();
          await expect(checkboxes.nth(1)).not.toBeChecked();
          await expect(checkboxes.nth(2)).not.toBeChecked();
          await expect(group).toHaveCustomValue([], { form: true });
          expect(await group.evaluate((node: CheckboxGroup) => node.reportValidity())).toBe(false);
        });

        it("It coerces the values that it receives to `string`s", async ({ page }) => {
          // Setup
          const name = "my-checkbox-group";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <form aria-label="Test Form">
              <checkbox-group name="${name}">
                <fieldset>
                  ${createCheckbox({ name: "numbers", value: "1" })}
                  ${createCheckbox({ name: "numbers", value: "2" })}
                  ${createCheckbox({ name: "numbers", value: "3" })}
                </fieldset>
              </checkbox-group>
            </form>
          `;

          // Assertions
          const group = page.getByRole("group");
          const checkboxes = group.locator("fieldset").getByRole("checkbox");

          await expect(group).toHaveCustomValue([], { form: true });
          await Promise.all((await checkboxes.all()).map((c) => expect(c).not.toBeChecked()));

          // @ts-expect-error -- Intentionally testing coercion of values to `string` type
          await group.evaluate((node: CheckboxGroup) => (node.value = [1, "2", 3]));
          await expect(group).toHaveCustomValue(["1", "2", "3"], { form: true });
          await Promise.all((await checkboxes.all()).map((c) => expect(c).toBeChecked()));
        });
      });

      it.describe("name (Property)", () => {
        it("Exposes the underlying `name` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialName = "initial-group";
          await page.goto(url);
          await renderHTMLToPage(page)`<checkbox-group name="${initialName}"><fieldset></fieldset></checkbox-group>`;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("name", initialName);

          // `attribute` responds to `property` updates
          const newPropertyName = "property-group";
          await group.evaluate((node: CheckboxGroup, name) => (node.name = name), newPropertyName);
          await expect(group).toHaveAttribute("name", newPropertyName);

          // `property` responds to `attribute` updates
          const newAttributeName = "attribute-group";
          await group.evaluate((node: CheckboxGroup, name) => node.setAttribute("name", name), newAttributeName);
          await expect(group).toHaveJSProperty("name", newAttributeName);
        });

        it("Complies with Form Standards by yielding an empty string in lieu of an attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`<checkbox-group><fieldset></fieldset></checkbox-group>`;

          /* ---------- Assertions ---------- */
          // `property` defaults to empty string
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("name", "");

          // `property` still defaults to empty string when the `name` attribute is _cleared_
          await group.evaluate((node: CheckboxGroup) => {
            node.setAttribute("name", "some-valid-name");
            node.removeAttribute("name");
          });

          await expect(group).toHaveJSProperty("name", "");
        });
      });

      it.describe("disabled (Property)", () => {
        it("Exposes the underlying `disabled` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`<checkbox-group disabled><fieldset></fieldset></checkbox-group>`;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("disabled", true);

          // `attribute` responds to `property` updates
          await group.evaluate((node: CheckboxGroup) => (node.disabled = false));
          await expect(group).not.toHaveAttribute("disabled");

          await group.evaluate((node: CheckboxGroup) => (node.disabled = true));
          await expect(group).toHaveAttribute("disabled", "");

          // `property` also responds to `attribute` updates
          await group.evaluate((node: CheckboxGroup) => node.removeAttribute("disabled"));
          await expect(group).toHaveJSProperty("disabled", false);
        });

        it("Toggles the disabled state of its `checkbox` descendants", async ({ page }) => {
          await page.goto(url);
          for (const mountDisabled of [true, false] as const) {
            const step = mountDisabled ? "Mounted with `disabled` attribute" : "Imperatively disabled after mount";
            await it.step(step, async () => {
              /* -------------------- Setup -------------------- */
              await renderHTMLToPage(page)`
                <checkbox-group ${mountDisabled ? "disabled" : ""}>
                  <fieldset>
                    ${createCheckbox({ name: "subject", value: "math" })}
                    ${createCheckbox({ name: "subject", value: "science", checked: true })}
                    ${createCheckbox({ name: "subject", value: "english" })}
                  </fieldset>
                </checkbox-group>
              `;

              const group = page.getByRole("group");
              const fieldset = group.locator("fieldset");
              const checkboxes = fieldset.getByRole("checkbox");

              /* -------------------- Assertions -------------------- */
              // Mount / Imperatively Set as `disabled`
              await expect(group).toHaveJSProperty("disabled", mountDisabled);
              if (!mountDisabled) await group.evaluate((node: CheckboxGroup) => (node.disabled = true));
              await expect(group).toHaveAttribute("disabled", "");
              await expect(group).toHaveCustomValue(["science"]);

              // <fieldset> and `checkbox`es should be disabled
              await expect(fieldset).toHaveJSProperty("disabled", true);
              await expect(checkboxes).toHaveCount(3);
              await expect(fieldset.getByRole("checkbox", { disabled: true })).toHaveCount(3);

              // Enable `checkbox-group`
              await group.evaluate((node: CheckboxGroup) => (node.disabled = false));
              await expect(group).not.toHaveAttribute("disabled");
              await expect(group).toHaveCustomValue(["science"]);

              await expect(fieldset).toHaveJSProperty("disabled", false);
              await expect(checkboxes).toHaveCount(3);
              await expect(fieldset.getByRole("checkbox", { disabled: false })).toHaveCount(3);
            });
          }
        });
      });

      it.describe("required (Property)", () => {
        it("Exposes the underlying `required` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group required>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("required", true);

          // `attribute` responds to `property` updates
          await group.evaluate((node: CheckboxGroup) => (node.required = false));
          await expect(group).not.toHaveAttribute("required");

          await group.evaluate((node: CheckboxGroup) => (node.required = true));
          await expect(group).toHaveAttribute("required", "");

          // `property` also responds to `attribute` updates
          await group.evaluate((node) => node.removeAttribute("required"));
          await expect(group).toHaveJSProperty("required", false);
        });

        it("Marks the group as `invalid` when the `required` constraint is broken", async ({ page }) => {
          const error = "Please select one or more items.";
          const group = page.getByRole("group");
          const checkboxes = group.locator("fieldset").getByRole("checkbox");
          await page.goto(url);

          await it.step("Imperative updates to `required` attribute (via JS Property Changes)", async () => {
            await renderHTMLToPage(page)`
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            `;

            // `group` starts off valid without constraints
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.valueMissing", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // `group` becomes invalid when `required` is applied because nothing is selected
            await group.evaluate((node: CheckboxGroup) => (node.required = true));
            await expect(group).toHaveCustomValue([]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.valueMissing", true);
            await expect(group).toHaveJSProperty("validationMessage", error);

            // `group` becomes valid when at least one checkbox is selected
            await checkboxes.first().click();
            await expect(group).toHaveCustomValue(["math"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.valueMissing", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // `group` becomes invalid again when all checkboxes become unselected
            await checkboxes.first().press(" ");
            await expect(group).toHaveCustomValue([]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.valueMissing", true);
            await expect(group).toHaveJSProperty("validationMessage", error);

            // `group` can be made valid again by removing the `required` constraint entirely
            await group.evaluate((node: CheckboxGroup) => (node.required = false));
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.valueMissing", false);
            await expect(group).toHaveJSProperty("validationMessage", "");
          });

          await it.step("Declarative updates to `required` attribute (via DOM Mounting)", async () => {
            // Mounting as `required` without anything selected
            await renderHTMLToPage(page)`
              <checkbox-group required>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).toHaveCustomValue([]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.valueMissing", true);
            await expect(group).toHaveJSProperty("validationMessage", error);

            // Mounting as `required` with 1 item selected
            await renderHTMLToPage(page)`
              <checkbox-group required>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science", checked: true })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).toHaveCustomValue(["science"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.valueMissing", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // Mounting as NOT `required` with 1 item selected
            await renderHTMLToPage(page)`
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).toHaveJSProperty("required", false);
            await expect(group).toHaveCustomValue(["english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.valueMissing", false);
            await expect(group).toHaveJSProperty("validationMessage", "");
          });
        });
      });

      it.describe("valueMissingError (Property)", () => {
        const defaultRequiredError = "Please select one or more items.";

        it("Exposes the underlying `valuemissingerror` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialAttr = "I think you forgot something?";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group valuemissingerror="${initialAttr}">
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("valueMissingError", initialAttr);

          // `attribute` responds to `property` updates
          const newProp = "property error";
          await group.evaluate((node: CheckboxGroup, prop) => (node.valueMissingError = prop), newProp);
          await expect(group).toHaveAttribute("valuemissingerror", newProp);

          // `property` responds to `attribute` updates
          const newAttr = "attribute-error";
          await group.evaluate((node: CheckboxGroup, a) => node.setAttribute("valuemissingerror", a), newAttr);
          await expect(group).toHaveJSProperty("valueMissingError", newAttr);
        });

        it("Provides a default message when the attribute is omitted", async ({ page }) => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).not.toHaveAttribute("valuemissingerror");
          await expect(group).toHaveJSProperty("valueMissingError", defaultRequiredError);
        });

        it("Controls the error displayed to users when the `required` constraint is broken", async ({ page }) => {
          const requiredError = "Why won't you interact with me?";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group required valuemissingerror="${requiredError}">
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math" })}
                ${createCheckbox({ name: "subject", value: "science" })}
                ${createCheckbox({ name: "subject", value: "english" })}
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveAttribute("valuemissingerror", requiredError);
          expect(requiredError).not.toBe(defaultRequiredError);

          // "Value Missing" Error Message should be displayed because the component was invalid when mounted
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.valueMissing", true);
          await expect(group).toHaveJSProperty("validationMessage", requiredError);

          // The default error message will be displayed instead if the attribute is removed
          await group.evaluate((node) => node.removeAttribute("valuemissingerror"));
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.valueMissing", true);
          await expect(group).toHaveJSProperty("validationMessage", defaultRequiredError);

          // But the custom message can be brought back by updating the attribute/property again
          await group.evaluate((node: CheckboxGroup, e) => (node.valueMissingError = e), requiredError);
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.valueMissing", true);
          await expect(group).toHaveJSProperty("validationMessage", requiredError);
          await expect(group).not.toHaveJSProperty("validationMessage", defaultRequiredError);
        });
      });

      it.describe("min (Property)", () => {
        it("Exposes the underlying `min` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialMin = "2";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group min="${initialMin}">
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("min", initialMin);

          // `attribute` responds to `property` updates
          const newProperty = "3";
          await group.evaluate((node: CheckboxGroup, prop) => (node.min = prop), newProperty);
          await expect(group).toHaveAttribute("min", newProperty);

          // `property` responds to `attribute` updates
          const newAttribute = "1";
          await group.evaluate((node: CheckboxGroup, attr) => node.setAttribute("min", attr), newAttribute);
          await expect(group).toHaveJSProperty("min", newAttribute);

          // Coercion of `number`s to `string`s is supported
          const number = 3;
          // @ts-expect-error -- Intentionally testing coercion of values to `string` type
          await group.evaluate((node: CheckboxGroup, num) => (node.min = num), number);
          await expect(group).toHaveAttribute("min", String(number));
        });

        it("Marks the `group` as `invalid` when the `min` constraint is broken", async ({ page }) => {
          const min = "2";
          const error = <T>(m: T) => `Please select at least ${m} ${m === "1" ? "item" : "items"}.` as const;

          const group = page.getByRole("group");
          const checkboxes = group.locator("fieldset").getByRole("checkbox");
          await page.goto(url);

          await it.step("Imperative updates to `min` attribute (via JS Property Changes)", async () => {
            await renderHTMLToPage(page)`
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            `;

            // `group` starts off valid without constraints
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // `group` becomes invalid when `min` is applied because nothing is selected
            await group.evaluate((node: CheckboxGroup, num) => (node.min = num), min);
            await expect(group).toHaveCustomValue([]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(min));

            // `group` becomes valid when at least 2 checkboxes are selected
            await checkboxes.nth(0).click();
            await expect(group).toHaveCustomValue(["math"]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(min));

            await checkboxes.nth(1).click();
            await expect(group).toHaveCustomValue(["math", "science"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            await checkboxes.nth(2).click();
            await expect(group).toHaveCustomValue(["math", "science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // `group` becomes invalid again when less than 2 checkboxes are selected
            await checkboxes.nth(2).press(" ");
            await expect(group).toHaveCustomValue(["math", "science"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            await checkboxes.nth(1).press(" ");
            await expect(group).toHaveCustomValue(["math"]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(min));

            // `group` can be made valid again by removing the `min` constraint entirely
            await group.evaluate((node) => node.removeAttribute("min"));
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");
          });

          await it.step("Declarative updates to `min` attribute (via DOM Mounting)", async () => {
            // Mounting with `min` without enough items selected
            await renderHTMLToPage(page)`
              <checkbox-group min="${min}">
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math", checked: true })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english" })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).toHaveCustomValue(["math"]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(min));

            // Mounting with `min` using minimum necessary selected items
            await renderHTMLToPage(page)`
              <checkbox-group min="${min}">
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science", checked: true })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            expect(await group.getAttribute("min")).toBe(
              String(await group.evaluate((node: CheckboxGroup) => node.value.length)),
            );
            await expect(group).toHaveCustomValue(["science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // Mounting WITHOUT `min` using minimum necessary selected items
            await renderHTMLToPage(page)`
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math", checked: true })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).not.toHaveAttribute("min");
            await expect(group).toHaveCustomValue(["math", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");
          });
        });

        it("Is not triggered by non-numeric values", async ({ page }) => {
          const badMin = "1a";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group min="${badMin}">
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math" })}
                ${createCheckbox({ name: "subject", value: "science" })}
                ${createCheckbox({ name: "subject", value: "english" })}
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveCustomValue([]);
          await expect(group).toHaveJSProperty("min", badMin);
          await expect(group).not.toHaveJSProperty("min", expect.stringMatching(/^\d+$/));

          await expect(group).toHaveJSProperty("validity.valid", true);
          await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
          await expect(group).toHaveJSProperty("validationMessage", "");
        });
      });

      it.describe("rangerUnderflowError (Property)", () => {
        const defaultMinError = <T>(m: T) => `Please select at least ${m} ${m === "1" ? "item" : "items"}.` as const;

        it("Exposes the underlying `rangeunderflowerror` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialAttr = "You must choose moar!!!";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group rangeunderflowerror="${initialAttr}">
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("rangeUnderflowError", initialAttr);

          // `attribute` responds to `property` updates
          const newProp = "property error";
          await group.evaluate((node: CheckboxGroup, prop) => (node.rangeUnderflowError = prop), newProp);
          await expect(group).toHaveAttribute("rangeunderflowerror", newProp);

          // `property` responds to `attribute` updates
          const newAttr = "attribute-error";
          await group.evaluate((node: CheckboxGroup, a) => node.setAttribute("rangeunderflowerror", a), newAttr);
          await expect(group).toHaveJSProperty("rangeUnderflowError", newAttr);
        });

        it("Provides a default, pluralized message when the attribute is omitted", async ({ page }) => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).not.toHaveAttribute("rangeunderflowerror");

          // Singular Phrasing
          await group.evaluate((node) => node.setAttribute("min", "1"));
          await expect(group).toHaveJSProperty("rangeUnderflowError", defaultMinError("1"));
          expect(await group.evaluate((node: CheckboxGroup) => node.rangeUnderflowError)).toEqual(
            expect.stringMatching(/item\.$/),
          );

          // Plural Phrasing
          await group.evaluate((node) => node.setAttribute("min", "2"));
          await expect(group).toHaveJSProperty("rangeUnderflowError", defaultMinError("2"));
          expect(await group.evaluate((node: CheckboxGroup) => node.rangeUnderflowError)).toEqual(
            expect.stringMatching(/items\.$/),
          );
        });

        it("Controls the error displayed to users when the `min` constraint is broken", async ({ page }) => {
          const minError = "Can you choose more stuff plz?";
          const min = "3";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group min="${min}" rangeunderflowerror="${minError}">
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math" })}
                ${createCheckbox({ name: "subject", value: "science" })}
                ${createCheckbox({ name: "subject", value: "english" })}
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveAttribute("rangeunderflowerror", minError);
          expect(minError).not.toMatch(defaultMinError(min));

          // "Range Underflow" Error Message should be displayed because the component was invalid when mounted
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
          await expect(group).toHaveJSProperty("validationMessage", minError);

          // The default error message will be displayed instead if the attribute is removed
          await group.evaluate((node) => node.removeAttribute("rangeunderflowerror"));
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
          await expect(group).toHaveJSProperty("validationMessage", defaultMinError(min));

          // But the custom message can be brought back by updating the attribute/property again
          await group.evaluate((node: CheckboxGroup, e) => (node.rangeUnderflowError = e), minError);
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
          await expect(group).toHaveJSProperty("validationMessage", minError);
          await expect(group).not.toHaveJSProperty("validationMessage", defaultMinError(min));
        });
      });

      it.describe("max (Property)", () => {
        it("Exposes the underlying `max` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialMax = "2";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group max="${initialMax}">
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("max", initialMax);

          // `attribute` responds to `property` updates
          const newProperty = "3";
          await group.evaluate((node: CheckboxGroup, prop) => (node.max = prop), newProperty);
          await expect(group).toHaveAttribute("max", newProperty);

          // `property` responds to `attribute` updates
          const newAttribute = "1";
          await group.evaluate((node: CheckboxGroup, attr) => node.setAttribute("max", attr), newAttribute);
          await expect(group).toHaveJSProperty("max", newAttribute);

          // Coercion of `number`s to `string`s is supported
          const number = 1;
          // @ts-expect-error -- Intentionally testing coercion of values to `string` type
          await group.evaluate((node: CheckboxGroup, num) => (node.max = num), number);
          await expect(group).toHaveAttribute("max", String(number));
        });

        it("Marks the `group` as `invalid` when the `max` constraint is broken", async ({ page }) => {
          const max = "2";
          const error = <T>(m: T) => `Please select no more than ${m} ${m === "1" ? "item" : "items"}.` as const;

          const group = page.getByRole("group");
          const checkboxes = group.locator("fieldset").getByRole("checkbox");
          await page.goto(url);

          await it.step("Imperative updates to `max` attribute (via JS Property Changes)", async () => {
            await renderHTMLToPage(page)`
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math", checked: true })}
                  ${createCheckbox({ name: "subject", value: "science", checked: true })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            // `group` starts off valid without constraints
            await expect(group).toHaveCustomValue(["math", "science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // `group` becomes invalid when `max` is applied because too many items are selected
            await group.evaluate((node: CheckboxGroup, num) => (node.max = num), max);
            await expect(group).toHaveCustomValue(["math", "science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(max));

            // `group` becomes valid when no more than 2 checkboxes are selected
            await checkboxes.nth(0).click();
            await expect(group).toHaveCustomValue(["science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            await checkboxes.nth(1).press(" ");
            await expect(group).toHaveCustomValue(["english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            await checkboxes.nth(2).click();
            await expect(group).toHaveCustomValue([]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // `group` becomes invalid again when more than 2 checkboxes are selected
            await group.evaluate((node: CheckboxGroup) => (node.value = ["math", "science", "english"]));
            await expect(group).toHaveCustomValue(["math", "science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(max));

            // `group` can be made valid again by removing the `max` constraint entirely
            await group.evaluate((node) => node.removeAttribute("max"));
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");
          });

          await it.step("Declarative updates to `max` attribute (via DOM Mounting)", async () => {
            // Mounting with `max` with too many items selected
            await renderHTMLToPage(page)`
              <checkbox-group max="${max}">
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math", checked: true })}
                  ${createCheckbox({ name: "subject", value: "science", checked: true })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).toHaveCustomValue(["math", "science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", false);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
            await expect(group).toHaveJSProperty("validationMessage", error(max));

            // Mounting with `max` using maximum allowed selected items
            await renderHTMLToPage(page)`
              <checkbox-group max="${max}">
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math" })}
                  ${createCheckbox({ name: "subject", value: "science", checked: true })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            expect(await group.getAttribute("max")).toBe(
              String(await group.evaluate((node: CheckboxGroup) => node.value.length)),
            );
            await expect(group).toHaveCustomValue(["science", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");

            // Mounting WITHOUT `max` using maximum allowed selected items
            await renderHTMLToPage(page)`
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math", checked: true })}
                  ${createCheckbox({ name: "subject", value: "science" })}
                  ${createCheckbox({ name: "subject", value: "english", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            await expect(group).not.toHaveAttribute("max");
            await expect(group).toHaveCustomValue(["math", "english"]);
            await expect(group).toHaveJSProperty("validity.valid", true);
            await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
            await expect(group).toHaveJSProperty("validationMessage", "");
          });
        });

        it("Is not triggered by non-numeric values", async ({ page }) => {
          const badMax = "1a";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group max="${badMax}">
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math", checked: true })}
                ${createCheckbox({ name: "subject", value: "science", checked: true })}
                ${createCheckbox({ name: "subject", value: "english", checked: true })}
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveCustomValue(["math", "science", "english"]);
          await expect(group).toHaveJSProperty("max", badMax);
          await expect(group).not.toHaveJSProperty("max", expect.stringMatching(/^\d+$/));

          await expect(group).toHaveJSProperty("validity.valid", true);
          await expect(group).toHaveJSProperty("validity.rangeOverflow", false);
          await expect(group).toHaveJSProperty("validationMessage", "");
        });
      });

      it.describe("rangerOverflowError (Property)", () => {
        const defaultMaxError = <T>(m: T) =>
          `Please select no more than ${m} ${m === "1" ? "item" : "items"}.` as const;

        it("Exposes the underlying `rangeoverflowerror` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialAttr = "Stop! Remove some items please!";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group rangeoverflowerror="${initialAttr}">
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("rangeOverflowError", initialAttr);

          // `attribute` responds to `property` updates
          const newProp = "property error";
          await group.evaluate((node: CheckboxGroup, prop) => (node.rangeOverflowError = prop), newProp);
          await expect(group).toHaveAttribute("rangeoverflowerror", newProp);

          // `property` responds to `attribute` updates
          const newAttr = "attribute-error";
          await group.evaluate((node: CheckboxGroup, a) => node.setAttribute("rangeoverflowerror", a), newAttr);
          await expect(group).toHaveJSProperty("rangeOverflowError", newAttr);
        });

        it("Provides a default, pluralized message when the attribute is omitted", async ({ page }) => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).not.toHaveAttribute("rangeoverflowerror");

          // Singular Phrasing
          await group.evaluate((node) => node.setAttribute("max", "1"));
          await expect(group).toHaveJSProperty("rangeOverflowError", defaultMaxError("1"));
          expect(await group.evaluate((node: CheckboxGroup) => node.rangeOverflowError)).toEqual(
            expect.stringMatching(/item\.$/),
          );

          // Plural Phrasing
          await group.evaluate((node) => node.setAttribute("max", "2"));
          await expect(group).toHaveJSProperty("rangeOverflowError", defaultMaxError("2"));
          expect(await group.evaluate((node: CheckboxGroup) => node.rangeOverflowError)).toEqual(
            expect.stringMatching(/items\.$/),
          );
        });

        it("Controls the error displayed to users when the `max` constraint is broken", async ({ page }) => {
          const maxError = "LESS! LESS! LESS!";
          const max = "1";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group max="${max}" rangeoverflowerror="${maxError}">
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math", checked: true })}
                ${createCheckbox({ name: "subject", value: "science", checked: true })}
                ${createCheckbox({ name: "subject", value: "english", checked: true })}
              </fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveAttribute("rangeoverflowerror", maxError);
          expect(maxError).not.toMatch(defaultMaxError(max));

          // "Range Overflow" Error Message should be displayed because the component was invalid when mounted
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
          await expect(group).toHaveJSProperty("validationMessage", maxError);

          // The default error message will be displayed instead if the attribute is removed
          await group.evaluate((node) => node.removeAttribute("rangeoverflowerror"));
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
          await expect(group).toHaveJSProperty("validationMessage", defaultMaxError(max));

          // But the custom message can be brought back by updating the attribute/property again
          await group.evaluate((node: CheckboxGroup, e) => (node.rangeOverflowError = e), maxError);
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
          await expect(group).toHaveJSProperty("validationMessage", maxError);
          await expect(group).not.toHaveJSProperty("validationMessage", defaultMaxError(max));
        });
      });

      it.describe("manual (Property)", () => {
        it("Exposes the underlying `manual` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group manual>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("manual", true);

          // `attribute` responds to `property` updates
          await group.evaluate((node: CheckboxGroup) => (node.manual = false));
          await expect(group).not.toHaveAttribute("manual");

          await group.evaluate((node: CheckboxGroup) => (node.manual = true));
          await expect(group).toHaveAttribute("manual", "");

          // `property` also responds to `attribute` updates
          await group.evaluate((node) => node.removeAttribute("manual"));
          await expect(group).toHaveJSProperty("manual", false);
        });

        // NOTE: This is mainly to appease JS Frameworks, of course
        it("Prevents the `group` from automatically adopting the `<fieldset>`'s accessible label", async ({ page }) => {
          const accessibleName = "Some Boxes";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group manual>
              <fieldset>
                <legend>${accessibleName}</legend>
              </fieldset>
            </checkbox-group>
          `;

          const group = page.locator("checkbox-group");
          const legend = group.locator(":scope > fieldset > legend");

          await expect(legend).toBeVisible();
          await expect(legend).toHaveText(accessibleName);
          expect(await group.evaluate((node: CheckboxGroup) => node.labels.length)).toBe(0);
        });
      });

      it.describe("fieldset (Property)", () => {
        it("Exposes the `<fieldset>` element owned by the `group`", async ({ page }) => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          const fieldsetPropertyIsValid = await group.evaluate(
            (node: CheckboxGroup) =>
              node.fieldset instanceof HTMLFieldSetElement &&
              node.fieldset === node.firstElementChild &&
              node.fieldset === node.lastElementChild,
          );
          expect(fieldsetPropertyIsValid).toBe(true);
        });
      });

      it.describe("labels (Property)", () => {
        it("Exposes any `label`s associated with the `group`", async ({ page }) => {
          /* ---------- Setup ---------- */
          const groupId = "combobox";
          const firstLabel = "This is a Checkbox Group";
          const secondLabel = "Choose Your Items";

          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group id="${groupId}">
              <fieldset></fieldset>
            </checkbox-group>
            <label for="${groupId}">${firstLabel}</label>
          `;

          /* ---------- Assertions ---------- */
          // Group has semantic labels
          const group = page.getByRole("group");
          expect(await group.evaluate((n: CheckboxGroup) => n.labels.length)).toBe(1);
          expect(await group.evaluate((n: CheckboxGroup) => n.labels[0].textContent)).toBe(firstLabel);

          // Labels created after rendering also work
          await page.evaluate(
            ([id, label2]) => document.body.insertAdjacentHTML("afterbegin", `<label for="${id}">${label2}</label>`),
            [groupId, secondLabel] as const,
          );

          expect(await group.evaluate((n: CheckboxGroup) => n.labels.length)).toBe(2);
          expect(await group.evaluate((n: CheckboxGroup) => n.labels[0].textContent)).toBe(secondLabel);
          expect(await group.evaluate((n: CheckboxGroup) => n.labels[1].textContent)).toBe(firstLabel);
          expect(
            await group.evaluate((n: CheckboxGroup) => {
              return Array.prototype.every.call(n.labels, (l) => l instanceof HTMLLabelElement);
            }),
          ).toBe(true);
        });
      });

      it.describe("form (Property)", () => {
        it("Exposes the `form` with which the `group` is associated", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <form>
              <checkbox-group>
                <fieldset></fieldset>
              </checkbox-group>
            </form>
          `;

          /* ---------- Assertions ---------- */
          // Group has a semantic form
          const group = page.getByRole("group");
          expect(await group.evaluate((n: CheckboxGroup) => n.form?.id)).toBe("");
          expect(await group.evaluate((n: CheckboxGroup) => n.form instanceof HTMLFormElement)).toBe(true);

          // Group `form` property updates in response to attribute changes
          const form2Id = "final-form";
          await group.evaluate((n: CheckboxGroup, secondFormId) => n.setAttribute("form", secondFormId), form2Id);
          expect(await group.evaluate((n: CheckboxGroup) => n.form)).toBe(null);

          // Group `form` property updates in response to DOM changes
          await page.evaluate((secondFormId) => {
            document.body.insertAdjacentHTML("beforeend", `<form id="${secondFormId}"></form>`);
          }, form2Id);
          expect(await group.evaluate((n: CheckboxGroup) => n.form?.id)).toBe(form2Id);
          expect(await group.evaluate((n: CheckboxGroup) => n.form instanceof HTMLFormElement)).toBe(true);
        });
      });

      it.describe("validity (Property)", () => {
        it("Exposes the `ValidityState` of the `group`", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math" })}
                ${createCheckbox({ name: "subject", value: "science" })}
                ${createCheckbox({ name: "subject", value: "english" })}
              </fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // `group` has a real `ValidityState`
          const group = page.getByRole("group");
          expect(await group.evaluate((n: CheckboxGroup) => n.validity instanceof ValidityState)).toBe(true);

          // By default, `group` is valid without constraints
          expect(await group.evaluate((n: CheckboxGroup) => n.validity.valid)).toBe(true);

          // `ValidityState` updates with constraints
          await group.evaluate((n) => n.setAttribute("required", ""));
          expect(await group.evaluate((n: CheckboxGroup) => n.validity.valid)).toBe(false);
          expect(await group.evaluate((n: CheckboxGroup) => n.validity.valueMissing)).toBe(true);

          // `ValidityState` updates with user interaction
          await group.locator("fieldset").getByRole("checkbox").first().click();
          await expect(group).toHaveJSProperty("validity.valid", true);
          await expect(group).toHaveJSProperty("validity.valueMissing", false);
        });
      });

      it.describe("validationMessage (Property)", () => {
        it("Exposes the `group`'s error message", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "math" })}
                ${createCheckbox({ name: "subject", value: "science" })}
              </fieldset>
            </checkbox-group>
          `;

          /* ---------- Assertions ---------- */
          // No error message exists if no constraints are broken
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("validationMessage", "");

          // Error message exists if a constraint is broken
          await group.evaluate((node: CheckboxGroup) => node.setAttribute("required", ""));
          await expect(group).toHaveJSProperty("validationMessage", "Please select one or more items.");
        });
      });

      it.describe("willValidate (Property)", () => {
        // Note: See: https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate
        it("Correctly indicates when the `group` will partake in constraint validation", async ({ page }) => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");

          // With `disabled` conflict, `willValidate` is `false`
          await group.evaluate((node: CheckboxGroup) => node.setAttribute("disabled", ""));
          await expect(group).toHaveJSProperty("willValidate", false);

          // Without conflicts, `willValidate` is `true`
          await group.evaluate((node: CheckboxGroup) => node.removeAttribute("disabled"));
          await expect(group).toHaveJSProperty("willValidate", true);

          // NOTE: `readonly` is not supported on `checkbox` inputs. `aria-readonly` is also unsupported for `group`s.
          // Thus, we won't be running any tests with the `readonly` attribute, and developers should avoid using it.
        });
      });
    });

    it.describe("Validation Methods", () => {
      /*
       * NOTE: Currently, according to our knowledge, there's no way to run assertions on the native error bubbles
       * created by browsers.
       */
      for (const method of ["checkValidity", "reportValidity"] as const) {
        it.describe(`${method}()`, () => {
          it("Performs field validation when called", async ({ page }) => {
            /* ---------- Setup ---------- */
            await page.goto(url);
            await renderHTMLToPage(page)`
              <checkbox-group required>
                <fieldset>
                  ${createCheckbox({ name: "subject", value: "math", checked: true })}
                </fieldset>
              </checkbox-group>
            `;

            // Immediately start tracking `invalid` events on `group`
            const group = page.getByRole("group");
            const waitForInvalidEvent = await createDOMEventWaiter(group, "invalid", { event: "Event" });

            /* ---------- Assertions ---------- */
            // `group` is initially valid, so an `invalid` event shouldn't be dispatched
            expect(await group.evaluate((node: CheckboxGroup) => node.validity.valid)).toBe(true);
            expect(await group.evaluate((node: CheckboxGroup, m) => node[m](), method)).toBe(true);

            // But an `invalid` event will be dispatched if the `group` is invalid
            const checkbox = group.locator("fieldset").getByRole("checkbox");
            await checkbox.click();
            await expect(checkbox).not.toBeChecked();

            await expect(group).toHaveJSProperty("validity.valid", false);
            const eventsPromise = waitForInvalidEvent();
            expect(await group.evaluate((node: CheckboxGroup, m) => node[m](), method)).toBe(false);

            // Confirm our expectations by looking at the number of `invalid` events dispatched so far on the `group`
            const events = await eventsPromise;
            expect(events).toHaveLength(1);
          });
        });
      }

      it.describe("setCustomValidity()", () => {
        it("Sets/Clears the custom error message for the `group`", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("validity.valid", true);
          await expect(group).toHaveJSProperty("validity.customError", false);
          await expect(group).toHaveJSProperty("validationMessage", "");

          /* ---------- Assertions ---------- */
          // Applying a custom error
          const customError = "Here's an error... just because :)";
          await group.evaluate((node: CheckboxGroup, e) => node.setCustomValidity(e), customError);
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.customError", true);
          await expect(group).toHaveJSProperty("validationMessage", customError);

          // Clearing a custom error
          await group.evaluate((node: CheckboxGroup, e) => node.setCustomValidity(e), "");
          await expect(group).toHaveJSProperty("validity.valid", true);
          await expect(group).toHaveJSProperty("validity.customError", false);
          await expect(group).toHaveJSProperty("validationMessage", "");
        });
      });
    });

    it.describe("Dispatched Events", () => {
      for (const event of ["input", "change"] as const) {
        it.describe(`\`${event}\` Event`, () => {
          it(`Dispatches a(n) \`${event}\` event when the user toggles a \`checkbox\``, async ({ page }) => {
            /* ---------- Setup ---------- */
            await page.goto(url);
            await renderHTMLToPage(page)`
              <form>
                <checkbox-group name="subject">
                  <fieldset>
                    ${createCheckbox({ name: "subject", value: "math" })}
                    ${createCheckbox({ name: "subject", value: "science" })}
                    ${createCheckbox({ name: "subject", value: "english", checked: true })}
                  </fieldset>
                </checkbox-group>
              </form>
            `;

            const group = page.getByRole("group");
            const checkboxes = group.locator("fieldset").getByRole("checkbox");

            const waitForEvent = await createDOMEventWaiter(group, event, { event: "Event", document: true });
            const expectedEventInfo: Partial<Event> = { bubbles: true, composed: event === "input", cancelable: false };

            /* ---------- Assertions ---------- */
            // Clicking a `checkbox` with a Mouse
            const [events] = await Promise.all([waitForEvent(), checkboxes.first().click()]);
            await expect(checkboxes.first()).toBeChecked();
            await expect(group).toHaveCustomValue(["english", "math"], { form: true });
            expect(events).toHaveLength(1);

            // Clicking a `checkbox` with a Keyboard
            await Promise.all([waitForEvent(), checkboxes.last().press(" ")]);
            await expect(checkboxes.last()).not.toBeChecked();
            await expect(group).toHaveCustomValue(["math"], { form: true });
            expect(events).toHaveLength(2);

            // Verify that event details are correct
            events.forEach((e) => expect(e).toMatchObject(expectedEventInfo));
          });

          it(`Does not dispatch the \`${event}\` event if the event is not trusted`, async ({ page }) => {
            /* ---------- Setup ---------- */
            await page.goto(url);
            await renderHTMLToPage(page)`
              <form>
                <checkbox-group name="subject">
                  <fieldset>
                    ${createCheckbox({ name: "subject", value: "math" })}
                    ${createCheckbox({ name: "subject", value: "science" })}
                    ${createCheckbox({ name: "subject", value: "english", checked: true })}
                  </fieldset>
                </checkbox-group>
              </form>
            `;

            const timeout = 2000;
            const group = page.getByRole("group");
            const checkboxes = group.locator("fieldset").getByRole("checkbox");
            const waitForEvent = await createDOMEventWaiter(group, event, { event: "Event", timeout });

            /* ---------- Assertions ---------- */
            const checkbox = checkboxes.first();
            await expect(checkbox).not.toBeChecked();
            await expect(group).toHaveCustomValue(["english"], { form: true });

            const eventsPromise = waitForEvent();
            await checkbox.evaluate((node, type) => {
              node.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
            }, event);

            const error = await eventsPromise.catch<Error>((e) => e);
            expect(error).toEqual(new Error(`Timed out ${timeout}ms waiting for event ${event}.`));
            await expect(checkbox).not.toBeChecked();
            await expect(group).toHaveCustomValue(["english"], { form: true });
          });

          it(`Does not dispatch the \`${event}\` event if the \`checkbox\` click was canceled`, async ({ page }) => {
            /* ---------- Setup ---------- */
            await page.goto(url);
            await renderHTMLToPage(page)`
              <form>
                <checkbox-group name="subject">
                  <fieldset>
                    ${createCheckbox({ name: "subject", value: "math" })}
                    ${createCheckbox({ name: "subject", value: "science" })}
                    ${createCheckbox({ name: "subject", value: "english", checked: true })}
                  </fieldset>
                </checkbox-group>
              </form>
            `;

            const timeout = 2000;
            const group = page.getByRole("group");
            const checkboxes = group.locator("fieldset").getByRole("checkbox");
            const waitForEvent = await createDOMEventWaiter(group, event, { event: "Event", timeout });

            /* ---------- Assertions ---------- */
            // Cancel all events on 1st `checkbox`
            const checkbox = checkboxes.first();
            await checkbox.evaluate((node) => node.addEventListener("click", (e) => e.preventDefault(), true));

            // Event shouldn't be dispatched when 1st `checkbox` is clicked
            await expect(checkbox).not.toBeChecked();
            await expect(group).toHaveCustomValue(["english"], { form: true });
            const eventsPromise = waitForEvent();
            await checkbox.click();

            const error = await eventsPromise.catch<Error>((e) => e);
            expect(error).toEqual(new Error(`Timed out ${timeout}ms waiting for event ${event}.`));
            await expect(checkbox).not.toBeChecked();
            await expect(group).toHaveCustomValue(["english"], { form: true });
          });

          it(`Does not dispatch the \`${event}\` event if a \`checkbox\` was not clicked`, async ({ page }) => {
            /* ---------- Setup ---------- */
            await page.goto(url);
            await renderHTMLToPage(page)`
              <form>
                <checkbox-group name="subject">
                  <fieldset>
                    <ul role="list">
                      <li>
                        ${createCheckbox({ name: "subject", value: "math" })}
                      </li>
                    </ul>
                  </fieldset>
                </checkbox-group>
              </form>
            `;

            const timeout = 2000;
            const group = page.getByRole("group");
            const checkbox = group.locator("fieldset").getByRole("checkbox");
            const waitForEvent = await createDOMEventWaiter(group, event, { event: "Event", timeout });

            /* ---------- Assertions ---------- */
            // Click the wrapping `listitem` instead of the `checkbox`
            await expect(checkbox).not.toBeChecked();
            await expect(group).toHaveCustomValue([], { form: true });

            const eventsPromise = waitForEvent();
            const listitem = group
              .locator("fieldset")
              .getByRole("listitem")
              .filter({ has: page.getByRole("checkbox") });
            await expect(listitem).toBeVisible();
            await listitem.click();

            const error = await eventsPromise.catch<Error>((e) => e);
            expect(error).toEqual(new Error(`Timed out ${timeout}ms waiting for event ${event}.`));
            await expect(checkbox).not.toBeChecked();
            await expect(group).toHaveCustomValue([], { form: true });
          });
        });
      }
    });

    it.describe("Management of Children", () => {
      it("Requires a `<fieldset>` element to be its only direct descendant", async ({ page, browserName }) => {
        it.skip(browserName === "webkit", "WebKit struggles with detecting multiple errors generated on page-mount");
        await page.goto(url);

        const error = new TypeError("A <fieldset> element must be the only direct descendant of the `CheckboxGroup`.");
        const waitForNextError = createErrorWatcher(page);
        let errors: Error[];

        await it.step("During Mounting", async () => {
          // Mounting with NO CHILDREN
          [errors] = await Promise.all([waitForNextError(), renderHTMLToPage(page)`<checkbox-group></checkbox-group>`]);
          expect(errors).toHaveLength(1);
          expect(errors[0].name).toBe(error.constructor.name);
          expect(errors[0].message).toBe(error.message);

          // Mounting with ONLY a `<fieldset>` (Shouldn't Throw)
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          // Mounting with something OTHER than a `<fieldset>`
          await Promise.all([
            waitForNextError(),
            renderHTMLToPage(page)`
              <checkbox-group>
                <div></div>
              </checkbox-group>
            `,
          ]);

          expect(errors).toHaveLength(2);
          expect(errors[1].name).toBe(error.constructor.name);
          expect(errors[1].message).toBe(error.message);

          // Mounting with a `<fieldset>` that has a SIBLING
          await Promise.all([
            waitForNextError(),
            renderHTMLToPage(page)`
              <checkbox-group>
                <div></div>
                <fieldset></fieldset>
              </checkbox-group>
            `,
          ]);

          expect(errors).toHaveLength(3);
          expect(errors[2].name).toBe(error.constructor.name);
          expect(errors[2].message).toBe(error.message);
        });

        await it.step("During DOM Manipulation", async () => {
          // First, render a valid `<checkbox-group>` to clean up the old state on the `page`
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("tagName", "CHECKBOX-GROUP");

          // REMOVING ALL CHILDREN from the `group`
          await Promise.all([waitForNextError(), group.evaluate((node) => node.replaceChildren())]);
          expect(errors).toHaveLength(4);
          expect(errors[3].name).toBe(error.constructor.name);
          expect(errors[3].message).toBe(error.message);

          // Placing a proper `<fieldset>` back inside the `<checkbox-group>` (Shouldn't Throw)
          await group.evaluate((n) => n.append(Object.assign(document.createElement("fieldset"), { role: "none" })));

          // Replacing all children with something OTHER than a `<fieldset>
          await Promise.all([
            waitForNextError(),
            group.evaluate((node) => node.replaceChildren(document.createElement("div"))),
          ]);

          expect(errors).toHaveLength(5);
          expect(errors[4].name).toBe(error.constructor.name);
          expect(errors[4].message).toBe(error.message);

          // Replacing all children with a `<fieldest>` that has a SIBLING
          await Promise.all([
            waitForNextError(),
            group.evaluate((node) => {
              node.replaceChildren(
                document.createElement("div"),
                Object.assign(document.createElement("fieldset"), { role: "none" }),
              );
            }),
          ]);

          expect(errors).toHaveLength(6);
          expect(errors[5].name).toBe(error.constructor.name);
          expect(errors[5].message).toBe(error.message);
        });
      });

      // NOTE: It's harder (and maybe wasteful) to enforce this in the `MutationObserver`, so it's only enforced on mount.
      it("Requires its `<fieldset>` to contain only `checkbox` fields on mount", async ({ page, browserName }) => {
        it.skip(browserName === "webkit", "WebKit struggles with detecting multiple errors generated on page-mount");
        await page.goto(url);

        const error = new TypeError(
          "`checkbox`es are the only form controls allowed inside the `CheckboxGroup`'s <fieldset>",
        );
        const waitForNextError = createErrorWatcher(page);

        // Mounting with nothing (Shouldn't Throw)
        await renderHTMLToPage(page)`
          <checkbox-group>
            <fieldset></fieldset>
          </checkbox-group>
        `;

        // Mounting with a checkbox (Shouldn't Throw)
        await renderHTMLToPage(page)`
          <checkbox-group>
            <fieldset>
              ${createCheckbox({ name: "subject", value: "physics" })}
            </fieldset>
          </checkbox-group>
        `;

        // Mounting with a non-form-control (Shouldn't Throw)
        await renderHTMLToPage(page)`
          <checkbox-group>
            <fieldset>
              ${createCheckbox({ name: "subject", value: "physics" })}
              <div>Whatever</div>
            </fieldset>
          </checkbox-group>
        `;

        // Mounting with an `<input>` that isn't a `[type="checkbox"]`
        const [errors] = await Promise.all([
          waitForNextError(),
          renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "physics" })}
                <input name="text" type="text" />
              </fieldset>
            </checkbox-group>
          `,
        ]);

        expect(errors).toHaveLength(1);
        expect(errors[0].name).toBe(error.constructor.name);
        expect(errors[0].message).toBe(error.message);

        // Mounting with a `<select>`
        await Promise.all([
          waitForNextError(),
          renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "physics" })}
                <select name="select"></select>
              </fieldset>
            </checkbox-group>
          `,
        ]);

        expect(errors).toHaveLength(2);
        expect(errors[1].name).toBe(error.constructor.name);
        expect(errors[1].message).toBe(error.message);

        // Mounting with a `<textarea>`
        await Promise.all([
          waitForNextError(),
          renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "physics" })}
                <textarea name="textarea"></textarea>
              </fieldset>
            </checkbox-group>
          `,
        ]);

        expect(errors).toHaveLength(3);
        expect(errors[2].name).toBe(error.constructor.name);
        expect(errors[2].message).toBe(error.message);

        // Mounting with a `<button>`
        await Promise.all([
          waitForNextError(),
          renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "physics" })}
                <button name="button" type="button">Click Me</button>
              </fieldset>
            </checkbox-group>
          `,
        ]);

        expect(errors).toHaveLength(4);
        expect(errors[3].name).toBe(error.constructor.name);
        expect(errors[3].message).toBe(error.message);

        // Mounting with a nested `<fieldset>`
        await Promise.all([
          waitForNextError(),
          renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "physics" })}
                <fieldset></fieldset>
              </fieldset>
            </checkbox-group>
          `,
        ]);

        expect(errors).toHaveLength(5);
        expect(errors[4].name).toBe(error.constructor.name);
        expect(errors[4].message).toBe(error.message);
      });

      // NOTE: Obviously the assumption is that all `checkbox`es have the same `name`, otherwise they wouldn't be grouped.
      it("Adopts the name of its first `checkbox` on mount", async ({ page }) => {
        const name = "subject";
        await page.goto(url);
        await renderHTMLToPage(page)`
          <checkbox-group>
            <fieldset>
              ${createCheckbox({ name, value: "biology" })}
              ${createCheckbox({ name, value: "physics" })}
              ${createCheckbox({ name, value: "chemistry" })}
            </fieldset>
          </checkbox-group>
        `;

        await expect(page.getByRole("group")).toHaveJSProperty("name", name);
      });

      it("Removes the `name`s and form-associations of all `checkbox`es that it receives", async ({ page }) => {
        await page.goto(url);
        const group = page.getByRole("group");
        const checkboxes = group.locator("fieldset").getByRole("checkbox");

        await it.step("When the component initially mounts", async () => {
          await renderHTMLToPage(page)`
            <form>
              <checkbox-group>
                <fieldset>
                  ${createCheckbox({ name: "subjects", value: "math" })}
                  ${createCheckbox({ name: "subjects", value: "science" })}
                </fieldset>
              </checkbox-group>
            </form>
          `;

          // `<checkbox-group>` is form-associated
          expect(await group.evaluate((node: CheckboxGroup) => node.form instanceof HTMLFormElement)).toBe(true);

          // But the descendent `checkbox`es ARE NOT form-associated, nor do they have `name`s
          await expect(checkboxes).toHaveCount(2);
          await Promise.all((await checkboxes.all()).map((c) => expect(c).not.toHaveAttribute("name")));
          await Promise.all((await checkboxes.all()).map((c) => expect(c).toHaveAttribute("form", "")));
          await Promise.all((await checkboxes.all()).map((c) => expect(c).toHaveJSProperty("form", null)));
        });

        await it.step("When additional `checkbox`es are inserted", async () => {
          await checkboxes.last().evaluate((currentLastCheckbox: HTMLInputElement) => {
            // Art Checkbox
            const artCheckbox = document.createElement("input");
            Object.assign(artCheckbox, { id: "art", name: "subjects", type: "checkbox", value: "art" });

            const artLabel = document.createElement("label");
            Object.assign(artLabel, { htmlFor: artCheckbox.id, textContent: "Art" });

            // Bible Checkbox
            const bibleCheckbox = document.createElement("input");
            Object.assign(bibleCheckbox, { id: "bible", name: "subjects", type: "checkbox", value: "bible" });

            const bibleLabel = document.createElement("label");
            Object.assign(bibleLabel, { htmlFor: bibleCheckbox.id, textContent: "Bible" });

            // Insert new `checkbox`es
            currentLastCheckbox.labels?.[0].after(artCheckbox, artLabel, bibleCheckbox, bibleLabel);
          });

          // Newly-inserted `checkbox`es ARE NOT form-associated either, nor do they have `name`s
          await expect(checkboxes).toHaveCount(4);
          await Promise.all((await checkboxes.all()).map((c) => expect(c).not.toHaveAttribute("name")));
          await Promise.all((await checkboxes.all()).map((c) => expect(c).toHaveAttribute("form", "")));
          await Promise.all((await checkboxes.all()).map((c) => expect(c).toHaveJSProperty("form", null)));
        });
      });

      it("Transfers the `<fieldset>`'s accessible label to itself on mount (if it exists)", async ({ page }) => {
        await page.goto(url);
        const group = page.getByRole("group");
        const fieldset = group.locator(":scope > fieldset");
        const legend = fieldset.locator(":scope > legend");

        await it.step("With a `<legend>`", async () => {
          const accessibleName = "Fun Subjects";
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                <legend>${accessibleName}</legend>
                ${createCheckbox({ name: "subject", value: "physics" })}
                ${createCheckbox({ name: "subject", value: "calculus" })}
                ${createCheckbox({ name: "subject", value: "chemistry" })}
              </fieldset>
            </checkbox-group>
          `;

          await expect(legend).not.toBeAttached();
          await expect(fieldset).toHaveRole("none");
          expect(await group.evaluate((node: CheckboxGroup) => node.labels.length)).toBe(1);
          expect(await group.evaluate((node: CheckboxGroup) => node.labels[0].textContent)).toBe(accessibleName);
        });

        await it.step("WITHOUT a `<legend>`", async () => {
          const timeout = 1500;
          const waitForNextError = createErrorWatcher(page, { timeout });
          const errorPromise = waitForNextError();

          // Without a `<legend>`
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "physics" })}
                ${createCheckbox({ name: "subject", value: "calculus" })}
                ${createCheckbox({ name: "subject", value: "chemistry" })}
              </fieldset>
            </checkbox-group>
          `;

          await expect(legend).not.toBeAttached();
          await expect(fieldset).toHaveRole("none");
          expect(await group.evaluate((node: CheckboxGroup) => node.labels.length)).toBe(0);

          expect(await errorPromise.catch<Error>((e) => e)).toEqual(
            new Error(`Timed out ${timeout}ms waiting for a \`pageerror\` to occur.`),
          );
        });
      });

      it("Properly updates its value when replacing old `checkbox`es with synonymous new ones", async ({ page }) => {
        await page.goto(url);
        await renderHTMLToPage(page)`
          <form>
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subject", value: "calculus" })}
                ${createCheckbox({ name: "subject", value: "geometry", checked: true })}
                ${createCheckbox({ name: "subject", value: "statistics", checked: true })}
              </fieldset>
            </checkbox-group>
          </form>
        `;

        const group = page.getByRole("group");
        const checkboxes = group.locator("fieldset").getByRole("checkbox");

        const originalValues = ["geometry", "statistics"] as const;
        await expect(group).toHaveCustomValue(originalValues, { form: true });

        await it.step("Rearranging the `group`'s existing `checkbox`es", async () => {
          await checkboxes.nth(1).evaluate((node: HTMLInputElement) => {
            node.parentElement?.append(node);
            node.after(node.labels?.[0] as HTMLLabelElement);
          });

          await expect(group).toHaveCustomValue(originalValues.toReversed(), { form: true });
        });

        await it.step("Replacing the `group`'s current `checkbox`es with new but synonymous ones", async () => {
          await checkboxes.nth(1).evaluate((node: HTMLInputElement) => {
            const newCheckbox = node.cloneNode(true);
            if (newCheckbox === node) throw new Error("Clone the original `checkbox`. Don't use original reference.");
            node.replaceWith(newCheckbox);
          });

          await expect(group).toHaveCustomValue(originalValues, { form: true });
        });
      });

      it("Performs field validation when `checkbox`es are added or removed", async ({ page }) => {
        /* ---------- Setup ---------- */
        await page.goto(url);
        await renderHTMLToPage(page)`
          <form>
            <checkbox-group min="2">
              <fieldset>
                ${createCheckbox({ name: "subject", value: "calculus" })}
                ${createCheckbox({ name: "subject", value: "geometry", checked: true })}
                ${createCheckbox({ name: "subject", value: "statistics", checked: true })}
              </fieldset>
            </checkbox-group>
          </form>
        `;

        const group = page.getByRole("group");
        const checkboxes = group.locator("fieldset").getByRole("checkbox");
        await expect(group).toHaveCustomValue(["geometry", "statistics"], { form: true });
        await expect(group).toHaveJSProperty("validity.valid", true);

        /* ---------- Assertions ---------- */
        await it.step("Removing a Checked `checkbox`", async () => {
          await checkboxes.last().evaluate((node: HTMLInputElement) => {
            node.closest("checkbox-group")?.after(node);
            node.after(node.labels?.[0] as HTMLLabelElement);
          });
          await expect(group).toHaveCustomValue(["geometry"], { form: true });
          await expect(group).toHaveJSProperty("validity.valid", false);
          await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
        });

        await it.step("Adding a Checked `checkbox`", async () => {
          await page.getByRole("checkbox", { name: "Statistics" }).evaluate((node: HTMLInputElement) => {
            (node.previousElementSibling as CheckboxGroup).fieldset.append(node);
            node.after(node.labels?.[0] as HTMLLabelElement);
          });
          await expect(group).toHaveCustomValue(["geometry", "statistics"], { form: true });
          await expect(group).toHaveJSProperty("validity.valid", true);
          await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
        });
      });
    });

    it.describe("Miscellaneous Behaviors", () => {
      it("Prevents irrelevant `input`/`change` events from being dispatched", async ({ page }) => {
        /* ---------- Setup ---------- */
        await page.goto(url);
        await renderHTMLToPage(page)`
          <checkbox-group>
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
            </fieldset>
          </checkbox-group>
        `;

        const group = page.getByRole("group");
        const waitForDelegatedInputEvent = await createDOMEventWaiter(page, "input", { event: "Event" });
        const waitForDelegatedChangeEvent = await createDOMEventWaiter(page, "change", { event: "Event" });

        /* ---------- Assertions ---------- */
        // When clicking a `checkbox`, only the `<checkbox-group>`'s events should be seen, not the `<input>`'s
        const [delegatedInputEvents, delegatedChangeEvents] = await Promise.all([
          waitForDelegatedInputEvent(),
          waitForDelegatedChangeEvent(),
          await group.locator("fieldset").getByRole("checkbox").click(),
        ]);

        // The events count is `1` instead of `2` because the `checkbox`'s `input` and `change` events were suppressed
        expect(delegatedInputEvents).toHaveLength(1);
        expect(delegatedChangeEvents).toHaveLength(1);
      });

      // NOTE: This DOES NOT test invalid use cases. For Example: `min`/`max` cannot LEGITIMATELY be broken simultaneously.
      it("Appropriately prioritizes the various error messages", async ({ page }) => {
        const min = "2";
        const max = "3";
        const valueMissingError = "Please select one or more items.";
        const rangeUnderflowError = `Please select at least ${min} items.`;
        const rangeOverflowError = `Please select no more than ${max} items.`;
        const customError = "Do you understand the gravity of what you've done?";

        /* ---------- Setup ---------- */
        await page.goto(url);
        await renderHTMLToPage(page)`
          <checkbox-group max="${max}" required>
            <fieldset>
              ${createCheckbox({ name: "subjects", value: "math" })}
              ${createCheckbox({ name: "subjects", value: "bible" })}
              ${createCheckbox({ name: "subjects", value: "science" })}
              ${createCheckbox({ name: "subjects", value: "english" })}
            </fieldset>
          </checkbox-group>
        `;

        const group = page.getByRole("group");
        const allValues = ["math", "bible", "science", "english"] as const;

        /* ---------- Assertions ---------- */
        // The `required` constraint can be broken
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validationMessage", valueMissingError);

        // But its error message is subservient to the custom error message
        await group.evaluate((node: CheckboxGroup, e) => node.setCustomValidity(e), customError);
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validity.customError", true);
        await expect(group).toHaveJSProperty("validationMessage", customError);

        await group.evaluate((node: CheckboxGroup) => node.setCustomValidity(""));
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validity.customError", false);
        await expect(group).toHaveJSProperty("validationMessage", valueMissingError);

        // It is also subservient to the `min` error (because `required` is at best redundant if `min` exists)
        await group.evaluate((node: CheckboxGroup, value) => (node.min = value), min);
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
        await expect(group).toHaveJSProperty("validationMessage", rangeUnderflowError);

        await group.evaluate((node: CheckboxGroup) => node.removeAttribute("min"));
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
        await expect(group).toHaveJSProperty("validationMessage", valueMissingError);

        // But the `min` error itself is still subservient to custom error messages
        await group.evaluate((node: CheckboxGroup, num) => (node.min = num), min);
        await group.evaluate((node: CheckboxGroup, e) => node.setCustomValidity(e), customError);
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
        await expect(group).toHaveJSProperty("validity.customError", true);
        await expect(group).toHaveJSProperty("validationMessage", customError);

        await group.evaluate((node: CheckboxGroup) => node.setCustomValidity(""));
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", true);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", true);
        await expect(group).toHaveJSProperty("validity.customError", false);
        await expect(group).toHaveJSProperty("validationMessage", rangeUnderflowError);

        // The `max` error doesn't intersect the `required` or `min` errors. So it is triggered independently.
        await group.evaluate((node: CheckboxGroup, v) => (node.value = v), allValues.slice());
        await expect(group).toHaveCustomValue(allValues);
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", false);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
        await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
        await expect(group).toHaveJSProperty("validationMessage", rangeOverflowError);

        // And just like everything else, the `max` error is overridden by the supreme custom error if it exists
        await group.evaluate((node: CheckboxGroup, e) => node.setCustomValidity(e), customError);
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", false);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
        await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
        await expect(group).toHaveJSProperty("validity.customError", true);
        await expect(group).toHaveJSProperty("validationMessage", customError);

        await group.evaluate((node: CheckboxGroup) => node.setCustomValidity(""));
        await expect(group).toHaveJSProperty("validity.valid", false);
        await expect(group).toHaveJSProperty("validity.valueMissing", false);
        await expect(group).toHaveJSProperty("validity.rangeUnderflow", false);
        await expect(group).toHaveJSProperty("validity.rangeOverflow", true);
        await expect(group).toHaveJSProperty("validity.customError", false);
        await expect(group).toHaveJSProperty("validationMessage", rangeOverflowError);
      });

      // NOTE: This is primarily useful for transferring a11y attributes like `aria-describedby`
      it("Transfers its `<fieldset>`'s attributes to itself on mount", async ({ page }) => {
        await page.goto(url);
        await renderHTMLToPage(page)`
          <checkbox-group>
            <fieldset role="radiogroup" aria-invalid="true" aria-describedby="error-message">
            </fieldset>
          </checkbox-group>
        `;

        // The `role` attribute is still overridden
        const group = page.getByRole("group");
        const fieldset = group.locator("fieldset");

        await expect(group).toHaveRole("group");
        await expect(fieldset).toHaveRole("none");

        // But all other attributes transfer through
        await expect(group).toHaveAttribute("aria-invalid", String(true));
        await expect(group).toHaveAttribute("aria-describedby", "error-message");

        await expect(fieldset).not.toHaveAttribute("aria-invalid");
        await expect(fieldset).not.toHaveAttribute("aria-describedby");
      });

      it("Generates a random, unique ID for itself if one is not provided", async ({ page }) => {
        await page.goto(url);
        const group = page.getByRole("group");

        await it.step("Mounting without an ID", async () => {
          await renderHTMLToPage(page)`
            <checkbox-group>
              <fieldset></fieldset>
            </checkbox-group>
          `;

          await expect(group).toHaveAttribute("id", /^\w+$/);
        });

        await it.step("Mounting WITH an ID", async () => {
          const id = "my-own-id";
          await renderHTMLToPage(page)`
            <checkbox-group id="${id}">
              <fieldset></fieldset>
            </checkbox-group>
          `;

          await expect(group).toHaveAttribute("id", id);
        });
      });
    });

    it.describe("Form-associated Behaviors", () => {
      it("Resets its value to the `defaultChecked` `checkbox`es when its owning `form` is reset", async ({ page }) => {
        /* ---------- Setup ---------- */
        await page.goto(url);
        await renderHTMLToPage(page)`
          <form aria-label="Test Form">
            <checkbox-group>
              <fieldset>
                ${createCheckbox({ name: "subjects", value: "math" })}
                ${createCheckbox({ name: "subjects", value: "bible", checked: true })}
                ${createCheckbox({ name: "subjects", value: "science", checked: true })}
                ${createCheckbox({ name: "subjects", value: "english" })}
              </fieldset>
            </checkbox-group>

            <button type="reset">Reset</button>
          </form>
        `;

        const resetButton = page.getByRole("button");
        const group = page.getByRole("group");
        const checkboxes = group.locator("fieldset").getByRole("checkbox");
        await expect(group).toHaveCustomValue(["bible", "science"], { form: true });

        /* ---------- Assertions ---------- */
        await it.step("Resetting via Semantic `reset` Button", async () => {
          await checkboxes.nth(2).click();
          await checkboxes.last().click();
          await expect(group).toHaveCustomValue(["bible", "english"], { form: true });

          await resetButton.click();
          await expect(group).toHaveCustomValue(["bible", "science"], { form: true });
        });

        await it.step("Resetting via `HTMLFormElement.reset()` Method", async () => {
          await checkboxes.nth(1).click();
          await checkboxes.nth(1).click();
          await checkboxes.first().click();
          await expect(group).toHaveCustomValue(["science", "bible", "math"], { form: true });

          await group.evaluate((node: CheckboxGroup) => node.form?.reset());
          await expect(group).toHaveCustomValue(["bible", "science"], { form: true });
        });
      });

      // TODO: Playwright doesn't seem to be able to handle Form State Restoration yet... Maybe in the future?
      it.skip("Enables browsers to restore its value when needed", async ({ page }) => {
        /* ---------- Setup ---------- */
        await page.goto(`${url}/field-restoration-tests/checkbox-restoration`);
        const group = page.getByRole("group");
        await expect(group).toHaveCustomValue(["english"], { form: true });

        /* ---------- Assertions ---------- */
        // Alter the selected `checkbox`es
        const checkboxes = group.locator("fieldset").getByRole("checkbox");
        await checkboxes.first().click();
        await checkboxes.last().click();
        await expect(group).toHaveCustomValue(["math"], { form: true });

        // Fill in some other field values
        const textbox = page.getByRole("textbox");
        const textboxValue = "some-text";
        await textbox.fill(textboxValue);

        // Navigate to a new page, then go back to previous page
        await page.getByRole("link", { name: "Example Domain" }).click();
        await page.waitForURL("https://example.com");
        await page.goBack();

        // Form values should have been restored
        await page.waitForURL(`${url}/field-restoration-tests/checkbox-restoration`);
        await expect(textbox).toHaveValue(textboxValue);
        await expect(group).toHaveCustomValue(["math"], { form: true });
      });
    });

    it.describe("Compatibility with Form Validation Libraries", () => {
      function getFormObserverLibrary(library: string): `the Form Validity Observer${string}` {
        if (library === "core") return "the Form Validity Observer";
        return `the Form Validity Observer's Optional ${library.charAt(0).toUpperCase()}${library.slice(1)} Integration`;
      }

      const libraries = [
        { library: getFormObserverLibrary("core"), testUrlPath: "/library-tests/form-observer/index" },
        { library: getFormObserverLibrary("preact"), testUrlPath: "/library-tests/form-observer/preact/index" },
        { library: getFormObserverLibrary("react"), testUrlPath: "/library-tests/form-observer/react/index" },
        { library: getFormObserverLibrary("solid"), testUrlPath: "/library-tests/form-observer/solid/index" },
        { library: getFormObserverLibrary("svelte"), testUrlPath: "/library-tests/form-observer/svelte/index" },
        { library: getFormObserverLibrary("vue"), testUrlPath: "/library-tests/form-observer/vue/index" },
        { library: "React Hook Form", testUrlPath: "/library-tests/react-hook-form/index" },
      ] as const satisfies { library: string; testUrlPath: string }[];

      for (const { library, testUrlPath } of libraries) {
        it(`Works with ${library}`, async ({ page }) => {
          /* -------------------- Setup -------------------- */
          /*
           * TODO: Playwright does not yet seem to recognize that `formAssociated` controls are labeled
           * by `<label>` elements which point to them. We'll add a manual workaround for this for now...
           * but this is something that needs addressing in the future... We should open a GitHub Issue.
           */
          await page.goto(new URL(testUrlPath, url).toString());

          // To help with these tests, make every field EXCEPT the `CheckboxGroup` valid
          await it.step("Make all non-`CheckboxGroup`s valid", async () => {
            await page.getByRole("textbox", { name: "Email", exact: true }).fill("person@example.com");
            await page.getByRole("textbox", { name: "Password", exact: true }).fill("12345678A@c");
            await page.getByRole("textbox", { name: "Confirm Password", exact: true }).fill("12345678A@c");
            await page.getByRole("radio", { name: "Svelte", exact: true }).click();

            const comboboxes = page.getByRole("combobox");
            for (const combobox of await comboboxes.all()) {
              await combobox.click();
              const listboxId = (await combobox.getAttribute("aria-controls")) as string;
              await page.locator(`[id="${listboxId}"]`).getByRole("option").nth(1).click();
            }
          });

          // Verify that the `CheckboxGroup` was prepared correctly
          const group = page.getByRole("group");
          await expect(group).toHaveJSProperty("manual", false);
          await expect(group).toHaveJSProperty("labels.length", 1);
          await expect(group).toHaveJSProperty("labels.0.textContent", "Favorite Subjects");
          await expect(group).toHaveCustomValue(["bible"], { form: true });

          const min = "2";
          const max = "3";
          if (library !== "React Hook Form") {
            await expect(group).toHaveJSProperty("min", min);
            await expect(group).toHaveJSProperty("max", max);
          }

          // Track `alert`s caused by valid form submissions
          let alerts = 0;
          page.on("dialog", trackAlerts);
          async function trackAlerts(dialog: Dialog): Promise<void> {
            alerts += 1;
            await dialog.dismiss();
          }

          /* -------------------- Assertions -------------------- */
          // Force entire form to undergo validation. This will trigger the `input`-based re-validation.
          const submitter = page.getByRole("button", { name: "Sign Up", exact: true });
          await submitter.click();
          expect(alerts).toBe(0);

          // `min` constraint should have been broken
          await expect(group).toHaveAttribute("aria-invalid", String(true));
          await expect(group).toHaveAccessibleDescription(`Please select at least ${min} items.`);

          // Selecting a second `checkbox` should resolve the error
          const checkboxes = group.locator("fieldset").getByRole("checkbox");
          await checkboxes.nth(0).click();

          await expect(group).toHaveCustomValue(["bible", "math"], { form: true });
          await expect(group).toHaveAttribute("aria-invalid", String(false));
          await expect(group).toHaveAccessibleDescription("");

          await submitter.click();
          expect(alerts).toBe(1);

          // But selecting more than the maximum allowed number of `checkbox`es will introduce a new error
          await checkboxes.nth(2).press(" ");
          await expect(group).toHaveCustomValue(["bible", "math", "science"], { form: true });
          await expect(group).toHaveAttribute("aria-invalid", String(false));
          await expect(group).toHaveAccessibleDescription("");

          await checkboxes.nth(3).press(" ");
          await expect(group).toHaveCustomValue(["bible", "math", "science", "english"], { form: true });
          await expect(group).toHaveAttribute("aria-invalid", String(true));
          await expect(group).toHaveAccessibleDescription(`Please select no more than ${max} items.`);

          await submitter.click();
          expect(alerts).toBe(1);

          // This error can be resolved by staying within the `min`/`max` constraints
          await checkboxes.nth(0).press(" ");
          await expect(group).toHaveCustomValue(["bible", "science", "english"], { form: true });
          await expect(group).toHaveAttribute("aria-invalid", String(false));
          await expect(group).toHaveAccessibleDescription("");

          await submitter.click();
          expect(alerts).toBe(2);

          // Cleanup
          page.off("dialog", trackAlerts);
        });
      }
    });
  });
});
