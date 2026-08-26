/* eslint-disable guard-for-in */
/* eslint-disable no-void */
/* eslint-disable prefer-template */
import { test as it, expect as baseExpect } from "@playwright/test";
import type { Page, Locator, JSHandle, MatcherReturnType } from "@playwright/test";
import type MenuElement from "../MenuElement.js";
import type {} from "../types/dom.d.ts";

/*
 * NOTE: Accessibility expectations are guided by the ARIA APG "Menu Button" pattern:
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/examples/menu-button-actions/#kbd_label}
 *
 * The authoritative source for the *intended* behavior, however, is `MenuElement.js`, as there are some places
 * where the implementation deliberately diverges from the APG (e.g., `ArrowUp`/`ArrowDown` do NOT wrap around
 * the ends of the menu). The test names below describe the implementation's actual/desired behavior.
 */

/* ---------------------------------------- Types and Constants ---------------------------------------- */
/** Retrieves the type of the last item in an array */
type GetLast<T> = T extends readonly [...unknown[], infer U] ? U : never;

/** The attributes _commonly_ used for **testing** the `MenuElement`. (Declared to help avoid typos.) */
const attrs = Object.freeze({
  "aria-expanded": "aria-expanded",

  /** The HTML Attribute used to toggle the visibility of a `MenuElement` (typically via CSS) */
  "data-open": "data-open",

  /** The HTML Attribute used to identify a `menuitem`'s Action */
  "data-action": "data-action",

  /** An internal-implementation attribute used to ensure that the `MenuElement`'s `focusout` listener behaves correctly */
  "data-pointerdown": "data-pointerdown",
});

/** The default `id` used for {@link MenuElement `MenuElement`s} in tests */
const defaultMenuId = "menu";

/** The default `id` used for `menubutton`s in tests */
const defaultMenuButtonId = "menubutton";

/** The default accessible name for `menubutton`s in tests */
const defaultMenuButtonName = "Menu";

const url = "http://localhost:5173";
const testItems = Object.freeze([
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
] as const);

interface ObservationErrorOptions<T> extends ErrorOptions {
  /** The amount of time that a process waited for the anticipated event */
  timeout: number;

  /**
   * A list containing all of the successful observations which occurred
   * _before_ the observation failure indicated by this error
   */
  observations: T[];
}

/**
 * Represents an error that occurred because an anticipated event was not observed in the expected amount of time.
 *
 * Typically used in Test Helper Functions like {@link createDOMEventWaiter} and {@link createErrorWatcher}
 * to track when an event was not dispatched (or an error was not thrown) in the expected amount of time.
 */
class ObservationError<T = unknown> extends Error implements ObservationErrorOptions<T> {
  #timeout: ObservationErrorOptions<T>["timeout"];
  #observations: ObservationErrorOptions<T>["observations"];

  constructor(message: string, options: ObservationErrorOptions<T>) {
    super(message, options);
    this.#timeout = options.timeout;
    this.#observations = options.observations.slice();
  }

  get timeout() {
    return this.#timeout;
  }

  get observations() {
    return this.#observations;
  }
}

/* ---------------------------------------- Custom Assertions ---------------------------------------- */
const expect = baseExpect.extend({
  /** Asserts that the provided `menubutton` (and thus the `menu` that it owns) is accessibly expanded */
  async toBeExpanded(menubutton: Locator, options?: { timeout?: number }) {
    const name = "toBeExpanded";
    const timeout = options?.timeout ?? this.timeout;

    try {
      // `menubutton` state
      await baseExpect(menubutton).toHaveRole("button", { timeout });
      await baseExpect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(!this.isNot), { timeout });

      // `menu` display
      const menuId = (await menubutton.getAttribute("aria-controls", { timeout })) ?? "";
      const menu = menubutton.page().locator(`[id="${menuId}"]`);

      await baseExpect(menu).toHaveRole("menu", { timeout });
      const menuExpectation = this.isNot ? baseExpect(menu).not : baseExpect(menu);
      await menuExpectation.toBeVisible({ timeout });
      await menuExpectation.toHaveAttribute(attrs["data-open"], { timeout }); // Attribute is expected to drive display

      // `menuitem`s display
      const visibleItems = menu.getByRole("menuitem");
      if (this.isNot) await baseExpect(visibleItems).toHaveCount(0, { timeout });
      else {
        const visibleItemsCount = await visibleItems.count();
        await baseExpect(menu.getByRole("menuitem", { includeHidden: true })).toHaveCount(visibleItemsCount, {
          timeout,
        });
      }

      // Error Messaging is handled by `catch` block, so an empty string is fine here.
      return { name, pass: !this.isNot, message: () => "" };
    } catch (error) {
      const { matcherResult } = error as { matcherResult: MatcherReturnType };
      return { ...matcherResult, name, pass: this.isNot, message: () => String(matcherResult.message) };
    }
  },
  /**
   * Asserts that the provided `menu`'s currently-active `menuitem` is the one which has the `expected` accessible name.
   * (A `menuitem` is considered active if it has focus, per accessibility requirements.)
   *
   * NOTE: This assertion should only be used if the `menu` and its owning `menubutton` are expanded
   * (even for the negated use case). If the `menu` is closed, no `menuitem`s are focusable and therefore
   * none can be active.
   *
   * @param menu
   * @param expected The accessible name of the target `menuitem`
   * @param options
   */
  async toHaveActiveItem(menu: Locator, expected: string, options?: { timeout?: number }) {
    const name = "toHaveActiveItem";
    const timeout = options?.timeout ?? this.timeout;

    try {
      await baseExpect(menu).toHaveRole("menu", { timeout });
    } catch (error) {
      const { matcherResult } = error as { matcherResult: MatcherReturnType };
      return { ...matcherResult, name, pass: this.isNot, message: () => String(matcherResult.message) };
    }

    try {
      // Active `menuitem` is `:focus`ed and has a proper roving `tabindex` value
      const menuitem = menu.getByRole("menuitem", { name: expected, exact: true });
      const tabindex = "tabindex";

      if (this.isNot) {
        await baseExpect(menuitem).not.toBeFocused({ timeout });
        await baseExpect(menuitem).toHaveAttribute(tabindex, String(-1), { timeout });
      } else {
        await baseExpect(menuitem).toBeFocused({ timeout });
        await baseExpect(menuitem).toHaveAttribute(tabindex, String(0), { timeout });
      }

      // Verify that roving `tabindex` works correctly: EXACTLY ONE `menuitem` must ALWAYS be active when `menu` is open
      const invalidItems = menu.getByRole("menuitem").and(menu.locator(`:not([${tabindex}='0'], [${tabindex}='-1'])`));
      await baseExpect(invalidItems).toHaveCount(0, { timeout });

      const activeItems = menu.getByRole("menuitem").and(menu.locator(`:not([${tabindex}='-1'])`));
      await baseExpect(activeItems).toHaveCount(1, { timeout });
      await baseExpect(activeItems).toBeFocused({ timeout }); // Important: `:focus` also implies element is `visible`

      // Error Messaging is handled by `catch` block, so an empty string is fine here.
      return { name, pass: !this.isNot, message: () => "" };
    } catch (error) {
      const { matcherResult } = error as { matcherResult: MatcherReturnType };
      return { ...matcherResult, name, pass: this.isNot, message: () => String(matcherResult.message) };
    }
  },
});

/* ---------------------------------------- Miscellaneous Helpers ---------------------------------------- */
/**
 * Renders the default HTML used to test the {@link MenuElement} to the provided `page`.
 *
 * For convenience, this function also calls {@link Page.goto} with the default test {@link url} before rendering the HTML.
 */
async function renderDefaultHTMLToPage(
  page: Page,
  options?: {
    /**
     * The `menuitem`s that will be rendered to the DOM, expressed as a list of configurations for each `menuitem`.
     * Defaults to {@link testItems `testItems`}.
     */
    menuitems?: Parameters<typeof createMenuItem>[0][];
    /**
     * Indicates that a test wants to examine page scrolling behavior. When `true`, an HTML Element with
     * an unreasonably large height will be added to the DOM, forcing the page to become scrollable.
     * This is useful, for example, if you want to test that certain Keyboard Interactions _do not_
     * trigger the browser's default page-scrolling behavior.
     *
     * Values:
     * - `"top"`: An enormous block will be _prepended_ to the DOM.
     * - `"bottom"`: An enormous block will be _appended_ to the DOM.
     * - `"both"`: Enormous blocks will be prepended _and_ appended to the DOM.
     * - `true`: Same as `"bottom"`.
     * - `false` (**Default**): No block will be added to the page at all.
     */
    testPageScroll?: "top" | "bottom" | "both" | boolean;
  },
): Promise<void> {
  const { menuitems = testItems.map((name) => ({ name })), testPageScroll } = options ?? {};

  await page.goto(url);
  await renderHTMLToPage(page)`
    ${testPageScroll === "top" || testPageScroll === "both" ? createMassiveBlock() : ""}
    ${createMenuButton()}
    <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
      ${menuitems.map((menuitemConfig) => createMenuItem(menuitemConfig)).join("")}
    </menu-element>
    ${testPageScroll === true || testPageScroll === "bottom" || testPageScroll === "both" ? createMassiveBlock() : ""}
  `;
}

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
 * Creates the HTML for a new `menubutton` from the provided options.
 *
 * The returned element is always a `<button>`.
 */
function createMenuButton(options?: {
  /** The button's `id`. Defaults to {@link defaultMenuButtonId `defaultMenuButtonId`}. */
  id?: string;
  /** The `aria-controls` value for the button. Defaults to {@link defaultMenuId `defaultMenuId`}. */
  controls?: string;
  /** The `aria-expanded` value for the button. Defaults to `false`. */
  expanded?: `${boolean}`;
  /** The button's text content. Defaults to {@link defaultMenuButtonName `defaultMenuButtonName`}. */
  children?: string;
}) {
  const {
    id = defaultMenuButtonId,
    controls = defaultMenuId,
    expanded = false,
    children = defaultMenuButtonName,
  } = options ?? {};

  return `
    <button id="${id}" type="button" aria-controls="${controls}" aria-expanded="${expanded}" aria-haspopup="menu">
      ${children}
    </button>
  ` as const;
}

/**
 * Creates the HTML for a new `menuitem` from the provided options.
 *
 * NOTE: For simplicity, the `menuitem` is always a `<div>` element.
 */
function createMenuItem(options: {
  /** The accessible name of the `menuitem` */
  name: string;
  /**
   * The unique ID representing the action which the `menuitem` will perform when selected.
   * Defaults to {@link options.name `name`}, kebab-cased.
   */
  action?: string;
  /** Indicates that the `menuitem` will be disabled when initially rendered */
  disabled?: boolean;
}) {
  const { name } = options;
  const disabled = options.disabled ? (`aria-disabled="${true}"` as const) : "";
  const action = options.action ?? name.toLowerCase().replaceAll(" ", "-");
  return `<div role="menuitem" ${disabled} data-action="${action}">${name}</div>` as const;
}

/**
 * Produces a massive {@link HTMLDivElement} as a DOM String.
 * Used to force a web page to become scrollable, enabling tests to examine the page's scroll behavior.
 * (For example, you may want to test the scroll-prevention functionality of a web component.)
 */
function createMassiveBlock(): string {
  return `
    <div style="font-size: 3rem; font-weight: bold; text-align: right; background-color: red; height: 500vh;">
      Container for testing scroll prevention
    </div>
  `;
}

/** Returns a random item from the provided list of {@link items} (which defaults to {@link testItems}). */
function getRandomItem<T extends ReadonlyArray<string>>(items: T = testItems as unknown as T): T[number] {
  const itemIndex = Math.floor(Math.random() * items.length);
  return items[itemIndex];
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
  const [exposedPusherName] = await tryFunctionExposure(page, `push${type}event`, (e: unknown) => events.push(e as E));

  /** The timer related to {@link waitForDOMEvent}'s `Promise` rejection callback */
  let timer: NodeJS.Timeout | undefined;
  let resolve: Parameters<ConstructorParameters<typeof Promise<E[]>>[0]>[0];
  const [exposedResolverName] = await tryFunctionExposure(page, "callNodeJSResolve", () => {
    clearTimeout(timer);
    resolve(events);
  });

  const locatorUsed = "page" in target;
  const locator = "page" in target ? target : page.locator("body");

  // Setup tracking event handler
  await locator.evaluate(
    (node, [t, lu, opts, pusherName, resolverName]) => {
      const constructor = opts?.event;
      const nodeWithListener = !lu || opts?.document ? document : node;
      nodeWithListener.addEventListener(t, handleEvent, opts);

      function handleEvent(evt: Event) {
        if (constructor && !eval(`evt.constructor === ${constructor}`)) return;
        if (lu && evt.target !== node) return;

        const props: Record<string, unknown> = { constructor };
        for (const key in evt) props[key] = evt[key as keyof typeof evt];
        (window as any)[pusherName](props); // eslint-disable-line @typescript-eslint/no-explicit-any
        (window as any)[resolverName](); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    },
    [type, locatorUsed, options, exposedPusherName, exposedResolverName] as const,
  );

  return waitForDOMEvent;
  async function waitForDOMEvent(): Promise<typeof events> {
    return new Promise((res, reject) => {
      resolve = res;
      const timeout = options?.timeout || 2000;
      const error = new ObservationError(`Timed out ${timeout}ms waiting for event "${type}".`, {
        timeout,
        observations: events,
      });

      timer = setTimeout(reject, timeout, error);
    });
  }
}

/**
 * A more-forgiving version of {@link Page.exposeFunction}.
 *
 * Attempts to expose the provided `callback` on the provided `page`. If the function's `name` is already taken, it
 * will be suffixed with an incremental counter until the suffixed function name is available on the page.
 *
 * For example, if `myFunc` is already exposed, then `myFunc1` will be checked. If `myFunc1` is already exposed, then
 * `myFunc2` will be checked, and so on, until the suffixed function name can be successfully/safely exposed on the page.
 *
 * @returns A tuple containing:
 * - The function name that was successfully exposed on the page
 * - The original result returned from {@link Page.exposeFunction}
 */
async function tryFunctionExposure<T extends Parameters<Page["exposeFunction"]>[0]>(
  page: Page,
  name: T,
  callback: Parameters<Page["exposeFunction"]>[1],
): Promise<[`${T}${number | ""}`, Awaited<ReturnType<Page["exposeFunction"]>>]> {
  let i = 0;
  let exposedFunctionNameUnavailable = true;
  let exposedFunctionName = name as `${T}${number | ""}`;

  while (exposedFunctionNameUnavailable) {
    const nameTaken = await page.evaluate((n) => n in window, exposedFunctionName);
    if (nameTaken) exposedFunctionName = `${exposedFunctionName}${++i}` as typeof exposedFunctionName;
    else exposedFunctionNameUnavailable = false;
  }

  return [exposedFunctionName, await page.exposeFunction(exposedFunctionName, callback)];
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
      const error = new ObservationError(`Timed out ${timeout}ms waiting for a \`pageerror\` to occur.`, {
        timeout,
        observations: errors,
      });

      timer = setTimeout(reject, timeout, error);
    });
  }
}

/** A reusable {@link Page.evaluate} callback used to obtain the `window`'s scrolling dimensions */
const getWindowScrollDistance = () => ({ x: window.scrollX, y: window.scrollY }) as const;

/* ---------------------------------------- Tests ---------------------------------------- */
it.describe("Menu Element Web Component", () => {
  it.describe("User Interactions", () => {
    it.describe("Mouse Interactions", () => {
      it("Opens the `menu` when the `menubutton` is clicked, focusing the first `menuitem`", async ({ page }) => {
        await renderDefaultHTMLToPage(page);
        const menubutton = page.getByRole("button");
        await expect(menubutton).not.toBeExpanded();

        await menubutton.click();
        await expect(menubutton).toBeExpanded();

        const menu = page.getByRole("menu");
        const firstMenuItem = menu.getByRole("menuitem").first();
        expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
        await expect(menu).toHaveActiveItem((await firstMenuItem.textContent()) as string);
      });

      it("Closes the `menu` when the [expanded] `menubutton` is clicked", async ({ page, browserName }) => {
        await renderDefaultHTMLToPage(page);
        const menubutton = page.getByRole("button");
        await menubutton.click();
        await expect(menubutton).toBeExpanded();

        // Clicking the expanded `menubutton` properly collapses it
        // NOTE: Real Safari does not transfer `:focus` to `button`s on click, so neither does Playwright WebKit.
        await menubutton.click();
        await expect(menubutton).not.toBeExpanded();
        if (browserName !== "webkit") await expect(menubutton).toBeFocused();
      });

      it("Closes the `menu` when anything outside of it is clicked", async ({ page }) => {
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu");
        const menubutton = page.getByRole("button");

        await menubutton.click();
        await expect(menubutton).toBeExpanded();

        // Clicking `menu`
        const { x, y, height } = await menu.evaluate((node) => node.getBoundingClientRect());
        await page.mouse.click(x, y + height / 2);
        await expect(menubutton).toBeExpanded();
        await expect(menu.and(page.locator(":hover"))).toBeVisible();

        // Clicking `document.body`
        await page.locator("body").click();
        await expect(menubutton).not.toBeExpanded();
      });

      it("Marks the most recently hovered `menuitem` as active (focused)", async ({ page }) => {
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu");

        // The first `menuitem` is `active` by default when the `menu` opens
        const firstItem = testItems[0];
        await page.getByRole("button").click();
        await expect(menu).toHaveActiveItem(firstItem);

        // Hover a different `menuitem`
        const randomItem1 = getRandomItem(testItems.slice(1));
        await menu.getByRole("menuitem", { name: randomItem1 }).hover();
        await expect(menu).not.toHaveActiveItem(firstItem);
        await expect(menu).toHaveActiveItem(randomItem1);

        // Hover another different `menuitem`
        const randomItem2 = getRandomItem(testItems.filter((v, i) => i !== 0 && v !== randomItem1));
        await menu.getByRole("menuitem", { name: randomItem2 }).hover();
        await expect(menu).not.toHaveActiveItem(randomItem1);
        await expect(menu).not.toHaveActiveItem(firstItem);
        await expect(menu).toHaveActiveItem(randomItem2);
      });

      it("Does not activate non-`menuitem`s on hover", async ({ page }) => {
        // Setup
        await page.goto(url);
        await renderHTMLToPage(page)`
          ${createMenuButton()}
          <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
            ${createMenuItem({ name: testItems[0] })}
            ${createMenuItem({ name: testItems[1] })}
            <hr />
            ${createMenuItem({ name: testItems[2] })}
          </menu-element>
        `;

        const firstItem = testItems[0];
        const menu = page.getByRole("menu");
        await page.getByRole("button").click();
        await expect(menu).toHaveActiveItem(firstItem);

        // Hovering a `separator` does not move the active `menuitem`
        await menu.getByRole("separator").hover();
        await expect(menu).toHaveActiveItem(firstItem);

        // Hovering the `menu` itself (its border) does not move the active `menuitem` either
        const thirdItem = testItems[2];
        const thirdItemElement = menu.getByRole("menuitem", { name: thirdItem });
        const thirdItemBox = await thirdItemElement.evaluate((node) => node.getBoundingClientRect());
        const menuBox = await menu.evaluate((node) => node.getBoundingClientRect());
        await page.mouse.move(menuBox.x, thirdItemBox.y + thirdItemBox.height / 2);

        const hoveredElement = page.locator(":hover");
        await expect(thirdItemElement.and(hoveredElement)).not.toBeVisible();
        await expect(menu.and(hoveredElement)).toBeVisible();
        await expect(menu).toHaveActiveItem(firstItem);

        // But hovering a real `menuitem` will still activate it
        await thirdItemElement.hover();
        await expect(menu).not.toHaveActiveItem(firstItem);
        await expect(menu).toHaveActiveItem(thirdItem);
      });

      it("Selects a `menuitem` when clicked, closing the `menu` and refocusing the `menubutton`", async ({ page }) => {
        await renderDefaultHTMLToPage(page);

        // Expand the `menu`
        const menubutton = page.getByRole("button");
        await menubutton.click();
        await expect(menubutton).toBeExpanded();

        // Selecting a `menuitem` dispatches a `menuselect` event containing the `menuitem`'s Action ID
        const item = getRandomItem();
        const itemElement = page
          .getByRole("menu", { includeHidden: true })
          .getByRole("menuitem", { name: item, includeHidden: true });

        await expect(itemElement).toBeVisible();
        const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect");
        const [[event]] = await Promise.all([waitForMenuSelect(), itemElement.click()]);
        await expect(itemElement).toHaveAttribute(attrs["data-action"], event.detail);
        await expect(itemElement).toHaveAttribute(attrs["data-action"], item.toLowerCase());

        // Selection should have closed the `menu` and refocused the `menubutton`
        await expect(menubutton).not.toBeExpanded();
        await expect(menubutton).toBeFocused();
      });

      it("Does not select a `menuitem` that is disabled", async ({ page }) => {
        const disabledItem = getRandomItem();
        const menuitems = testItems.map((name) => ({ name, disabled: name === disabledItem }));
        await renderDefaultHTMLToPage(page, { menuitems });
        const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

        const menubutton = page.getByRole("button");
        await menubutton.click();
        await expect(menubutton).toBeExpanded();

        // Clicking a disabled `menuitem` does not select it, and the `menu` remains open
        const menu = page.getByRole("menu");
        const disabledItemElement = menu.getByRole("menuitem", { name: disabledItem, disabled: true });

        const eventPromise = waitForMenuSelect();
        await disabledItemElement.click({ force: true }); // Note: `force` is required because element is `disabled`
        await expect(menubutton).toBeExpanded();
        await expect(menubutton).not.toBeFocused();
        await expect(menu).toHaveActiveItem(disabledItem);

        const error = await eventPromise.catch((e: ObservationError) => e);
        expect(error).toBeInstanceOf(ObservationError);
        expect((error as ObservationError).observations).toHaveLength(0);
      });

      it("Does not attempt `menuitem` selection if a `separator` (or the `menu`) is clicked", async ({ page }) => {
        // Setup
        await page.goto(url);
        await renderHTMLToPage(page)`
          ${createMenuButton()}
          <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
            ${createMenuItem({ name: testItems[0] })}
            ${createMenuItem({ name: testItems[1] })}
            <hr />
            ${createMenuItem({ name: testItems[2] })}
          </menu-element>
        `;

        const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

        // Expand `menu`
        const firstItem = testItems[0];
        const menu = page.getByRole("menu");
        const menubutton = page.getByRole("button");

        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(firstItem);

        // Clicking a `separator` selects nothing, keeps the `menu` open, and preserves the active `menuitem`
        const eventPromise = waitForMenuSelect();
        await menu.getByRole("separator").click();
        await expect(menubutton).toBeExpanded();
        await expect(menubutton).not.toBeFocused();
        await expect(menu).toHaveActiveItem(firstItem);

        // Clicking the `menu` itself (its border) does the same
        const thirdItem = testItems[2];
        const thirdItemElement = menu.getByRole("menuitem", { name: thirdItem });
        const thirdItemBox = await thirdItemElement.evaluate((node) => node.getBoundingClientRect());
        const menuBox = await menu.evaluate((node) => node.getBoundingClientRect());
        await page.mouse.click(menuBox.x, thirdItemBox.y + thirdItemBox.height / 2);

        await expect(menubutton).toBeExpanded();
        await expect(menubutton).not.toBeFocused();
        await expect(menu).toHaveActiveItem(firstItem);

        // No `menuselect` event was ever dispatched
        const error = await eventPromise.catch((e: ObservationError) => e);
        expect(error).toBeInstanceOf(ObservationError);
        expect((error as ObservationError).observations).toHaveLength(0);
      });

      // NOTE: This saves users from accidentally closing the `menu` when they want to open a native `contextmenu`.
      it('Only responds to primary ("left") mouse clicks', async ({ page, browserName }) => {
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu");
        const menubutton = page.getByRole("button");
        const menuitem = menu.getByRole("menuitem", { name: getRandomItem() });
        const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

        // On the `menubutton`
        await menubutton.click({ button: "right" });
        await expect(menubutton).not.toBeExpanded();

        await menubutton.click({ button: "middle" });
        await expect(menubutton).not.toBeExpanded();

        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu.getByRole("menuitem").first()).toBeFocused();

        // On the `menuitem`s
        await menuitem.click({ button: "right" });
        await expect(menubutton).toBeExpanded();

        /*
         * TODO|GitHub: It is unclear why this `page.mouse.up` reset is needed for the `middle` button in Firefox (only),
         * but _not_ for the `right` button or the `left` button. We need to investigate this further and open an issue
         * if necessary.
         */
        await menuitem.click({ button: "middle" });
        if (browserName === "firefox") await page.mouse.up({ button: "middle" });
        await expect(menubutton).toBeExpanded();

        const [events] = await Promise.all([waitForMenuSelect(), menuitem.click()]);
        await expect(menubutton).not.toBeExpanded();
        await expect(menubutton).toBeFocused();
        expect(events).toHaveLength(1); // Only 1 `menuselect` event should have been dispatched

        // Opening a `contextmenu` on the `menubutton` does not apply the `data-pointerdown` attribute (memory leak check)
        await menubutton.click();
        await expect(menubutton).toBeExpanded();

        const { x, width, y, height } = await menubutton.evaluate((node) => node.getBoundingClientRect());
        await page.mouse.move(x + width / 2, y + height / 2);
        await page.mouse.down({ button: "right" });

        // `menubutton` won't have `data-pointerdown` (memory leak safety), but browser will still move focus
        // NOTE: Real Safari does not transfer `:focus` to `button`s on click, so neither does Playwright WebKit.
        await expect(menubutton).not.toHaveAttribute(attrs["data-pointerdown"]);
        await expect(menubutton).not.toBeExpanded();
        if (browserName !== "webkit") await expect(menubutton).toBeFocused();
      });
    });

    it.describe("Menu Button Keyboard Interactions", () => {
      // NOTE: The `Enter` and `SpaceBar` tests assume the `menubutton` is always a `<button>` -- a runtime-enforced constraint.
      it.describe("Enter", () => {
        it("Opens the `menu` and focuses the first `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menubutton = page.getByRole("button");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();

          const menu = page.getByRole("menu");
          const firstMenuItem = menu.getByRole("menuitem").first();
          expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
          await expect(menu).toHaveActiveItem((await firstMenuItem.textContent()) as string);
        });
      });

      it.describe("SpaceBar (' ')", () => {
        it("Opens the `menu` and focuses the first `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menubutton = page.getByRole("button");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press(" ");
          await expect(menubutton).toBeExpanded();

          const menu = page.getByRole("menu");
          const firstMenuItem = menu.getByRole("menuitem").first();
          expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
          await expect(menu).toHaveActiveItem((await firstMenuItem.textContent()) as string);
        });

        it("Avoids unwanted page scrolling (happens naturally for `<button>`s)", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "bottom" });
          const menubutton = page.getByRole("button");
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // No scrolling should occur when `SpaceBar` (' ') opens the `menu`
          await menubutton.press(" ");
          await expect(menubutton).toBeExpanded();
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("ArrowDown", () => {
        it("Opens the `menu` and focuses the first `menuitem` (if `openwitharrows` is set)", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu", { includeHidden: true });
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));

          const menubutton = page.getByRole("button");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("ArrowDown");
          await expect(menubutton).toBeExpanded();

          const firstMenuItem = menu.getByRole("menuitem").first();
          expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
          await expect(page.getByRole("menu")).toHaveActiveItem((await firstMenuItem.textContent()) as string);
        });

        it("Does nothing when `openwitharrows` is not set", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu", { includeHidden: true });

          await expect(menubutton).not.toBeExpanded();
          await expect(menu).toHaveJSProperty("openWithArrows", false);

          await menubutton.press("ArrowDown");
          await expect(menubutton).not.toBeExpanded();
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "bottom" });
          const menu = page.getByRole("menu", { includeHidden: true });
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));

          const menubutton = page.getByRole("button");
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // No scrolling should occur when `ArrowDown` opens the `menu`
          await menubutton.press("ArrowDown");
          await expect(menubutton).toBeExpanded();
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("ArrowUp", () => {
        it("Opens the `menu` and focuses the last `menuitem` (if `openwitharrows` is set)", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu", { includeHidden: true });
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));

          const menubutton = page.getByRole("button");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("ArrowUp");
          await expect(menubutton).toBeExpanded();

          const lastMenuItem = menu.getByRole("menuitem").last();
          expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
          await expect(menu).toHaveActiveItem((await lastMenuItem.textContent()) as string);
        });

        it("Does nothing when `openwitharrows` is not set", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu", { includeHidden: true });

          await expect(menubutton).not.toBeExpanded();
          await expect(menu).toHaveJSProperty("openWithArrows", false);

          await menubutton.press("ArrowUp");
          await expect(menubutton).not.toBeExpanded();
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "both" });
          const menu = page.getByRole("menu", { includeHidden: true });
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));

          const menubutton = page.getByRole("button");
          await menubutton.evaluate((node) => node.scrollIntoView({ block: "center" }));
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // No scrolling should occur when `ArrowUp` opens the `menu`
          await menubutton.press("ArrowUp");
          await expect(menubutton).toBeExpanded();
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });
    });

    it.describe("Menu Item Keyboard Interactions", () => {
      /*
       * NOTE: `page.keyboard.press()` is vital in this block to ensure `:focus` _naturally_ moves between `menuitem`s.
       * If we did `menuitem.press()`, Playwright would focus the element first, then attempt the keyboard action,
       * which would cause the `:focus`-related parts of our tests to be disrupted/broken.
       */
      it.describe("ArrowDown", () => {
        it("Moves focus to the next `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Each `ArrowDown` press activates the following `menuitem`
          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(testItems[1]);
          await expect(menu).not.toHaveActiveItem(testItems[0]);

          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(testItems[2]);
          await expect(menu).not.toHaveActiveItem(testItems[1]);
          await expect(menu).not.toHaveActiveItem(testItems[0]);
        });

        it("Skips `separator`s (non-`menuitem` siblings)", async ({ page }) => {
          // Setup
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${createMenuItem({ name: testItems[0] })}
              ${createMenuItem({ name: testItems[1] })}
              <hr />
              ${createMenuItem({ name: testItems[2] })}
            </menu-element>
          `;

          // Expand `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Move to `menuitem` preceding `separator`
          const separator = page.getByRole("separator");
          const itemPreSeparator = menu.getByRole("menuitem", { name: testItems[1] });
          await expect(itemPreSeparator.locator(":scope + *").and(separator)).toBeVisible();

          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem((await itemPreSeparator.textContent()) as string);

          // The `separator` is skipped when moving to the next `menuitem`
          const itemPostSeparator = menu.getByRole("menuitem", { name: testItems[2] });
          await expect(separator.locator(":scope + *").and(itemPostSeparator)).toBeVisible();

          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem((await itemPostSeparator.textContent()) as string);
          await expect(menu).not.toHaveActiveItem((await itemPreSeparator.textContent()) as string);
        });

        it("Does nothing if focus is on the last `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          const waitForNextError = createErrorWatcher(page, { timeout: 500 });

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Activate the last `menuitem`
          for (let i = 0; i < testItems.length - 1; i++) await page.keyboard.press("ArrowDown");
          const lastItem = testItems.at(-1) as GetLast<typeof testItems>;
          await expect(menu).toHaveActiveItem(lastItem);

          // Nothing changes (or throws) when `ArrowDown` is pressed again
          const errorPromise = waitForNextError();
          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(lastItem);

          const error = await errorPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "bottom" });
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu");

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // No page scrolling should occur when `ArrowDown` is pressed
          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(testItems[1]);
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("End", () => {
        it("Moves focus to the last `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          const lastMenuItem = menu.getByRole("menuitem").last();

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          await page.keyboard.press("End");
          expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
          await expect(menu).toHaveActiveItem((await lastMenuItem.textContent()) as string);
          await expect(menu).not.toHaveActiveItem(testItems[0]);
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "bottom" });
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu");

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // No page scrolling should occur when `End` is pressed
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("ArrowUp", () => {
        it("Moves focus to the previous `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Jump to the last `menuitem` so we have room to move upwards
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);

          // Each `ArrowUp` press activates the preceding `menuitem`
          await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem(testItems.at(-2) as string);
          await expect(menu).not.toHaveActiveItem(testItems.at(-1) as string);

          await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem(testItems.at(-3) as string);
          await expect(menu).not.toHaveActiveItem(testItems.at(-2) as string);
          await expect(menu).not.toHaveActiveItem(testItems.at(-1) as string);
        });

        it("Skips `separator`s (non-`menuitem` siblings)", async ({ page }) => {
          // Setup
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${createMenuItem({ name: testItems[0] })}
              ${createMenuItem({ name: testItems[1] })}
              <hr />
              ${createMenuItem({ name: testItems[2] })}
            </menu-element>
          `;

          // Expand `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Move to the last `menuitem`, which is the item succeeding the `separator`
          const separator = page.getByRole("separator");
          const itemPostSeparator = menu.getByRole("menuitem", { name: testItems[2] });
          await expect(separator.locator(":scope + *").and(itemPostSeparator)).toBeVisible();

          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem((await itemPostSeparator.textContent()) as string);

          // The `separator` is skipped when moving to the previous `menuitem`
          const itemPreSeparator = menu.getByRole("menuitem", { name: testItems[1] });
          await expect(itemPreSeparator.locator(":scope + *").and(separator)).toBeVisible();

          await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem((await itemPreSeparator.textContent()) as string);
          await expect(menu).not.toHaveActiveItem((await itemPostSeparator.textContent()) as string);
        });

        it("Does nothing if focus is on the first `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          const waitForNextError = createErrorWatcher(page, { timeout: 500 });

          // First `menuitem` is already focused when the `menu` is expanded
          const firstItem = testItems[0];
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(firstItem);

          // Nothing changes (or throws) when `ArrowUp` is pressed while the first `menuitem` is active
          const errorPromise = waitForNextError();
          await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem(firstItem);

          const error = await errorPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "both" });
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu");

          // Center `menubutton` in the viewport so that scrolling tests are reliable, then expand it
          await menubutton.evaluate((node) => node.scrollIntoView({ block: "center" }));
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          // Activate last `menuitem` so that `ArrowUp` does something (optional step)
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);

          /* ---------- Assertions ---------- */
          // No page scrolling should occur when `ArrowUp` is pressed
          await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem(testItems.at(-2) as string);
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("Home", () => {
        it("Moves focus to the first `menuitem`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          const firstMenuItem = menu.getByRole("menuitem").first();

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Jump to the last `menuitem`, then back to the first
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);

          await page.keyboard.press("Home");
          expect(await menu.getByRole("menuitem").count()).toBeGreaterThan(1);
          await expect(menu).toHaveActiveItem((await firstMenuItem.textContent()) as string);
          await expect(menu).not.toHaveActiveItem(testItems.at(-1) as string);
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page, { testPageScroll: "both" });
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu");

          // Center `menubutton` in the viewport so that scrolling tests are reliable, then expand it
          await menubutton.evaluate((node) => node.scrollIntoView({ block: "center" }));
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          // Activate last `menuitem` so that `Home` does something (optional step)
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);

          /* ---------- Assertions ---------- */
          // No page scrolling should occur when `Home` is pressed
          await page.keyboard.press("Home");
          await expect(menu).toHaveActiveItem(testItems[0]);
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("Escape", () => {
        it("Closes the `menu` and returns focus to the `menubutton`", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");

          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // `Escape` collapses the `menu` and returns focus to the `menubutton`
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();
          await expect(menubutton).toBeFocused();
        });

        it("Avoids unintended side-effects (e.g., prematurely closing `dialog`s)", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            <dialog>
              ${createMenuButton()}
              <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
                ${testItems.map((name) => createMenuItem({ name })).join("")}
              </menu-element>
            </dialog>
          `;

          /* ---------- Assertions ---------- */
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          const dialog = page.locator("dialog");

          // Open `dialog` and `menu`
          await dialog.evaluate((node: HTMLDialogElement) => node.showModal());
          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]); // Ensure a `menuitem` is focused before pressing keys

          // Close the `menu` without closing the `dialog` (i.e., without causing any side-effects)
          const defaultPrevented = page.evaluate(() => {
            return new Promise<boolean>((resolve) => {
              document.addEventListener("keydown", (event) => resolve(event.defaultPrevented), { once: true });
            });
          });

          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();
          await expect(menubutton).toBeFocused();
          await expect(dialog).toHaveJSProperty("open", true);
          expect(await defaultPrevented).toBe(true);

          // Properly close the `dialog` now that the `menu` is closed
          const defaultNotPrevented = page.evaluate(() => {
            return new Promise<boolean>((resolve) => {
              document.addEventListener("keydown", (event) => resolve(!event.defaultPrevented), { once: true });
            });
          });

          await page.keyboard.press("Escape");
          await expect(dialog).toHaveJSProperty("open", false);
          await expect(menubutton).not.toBeVisible();
          expect(await defaultNotPrevented).toBe(true);
        });
      });

      it.describe("Enter", () => {
        it("Selects the currently-focused `menuitem` and closes the `menu`, then focuses the `menubutton`", async ({
          page,
        }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu", { includeHidden: true });
          const menubutton = page.getByRole("button");

          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Navigate to a random `menuitem`
          const item = getRandomItem(testItems);
          const index = testItems.indexOf(item);
          for (let i = 0; i < index; i++) await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(item);

          // Pressing `Enter` selects the active `menuitem`, dispatching a `menuselect` with its Action ID
          const itemElement = menu.getByRole("menuitem", { name: item, includeHidden: true });
          await expect(itemElement).toBeVisible();

          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect");
          const [[event]] = await Promise.all([waitForMenuSelect(), page.keyboard.press("Enter")]);
          await expect(itemElement).toHaveAttribute(attrs["data-action"], event.detail);
          await expect(itemElement).toHaveAttribute(attrs["data-action"], item.toLowerCase());

          // Selection closes the `menu` and returns focus to the `menubutton`
          await expect(menubutton).not.toBeExpanded();
          await expect(menubutton).toBeFocused();
        });

        it("Does not select a `menuitem` that is disabled", async ({ page }) => {
          const disabledItem = getRandomItem(testItems);
          const menuitems = testItems.map((name) => ({ name, disabled: name === disabledItem }));
          await renderDefaultHTMLToPage(page, { menuitems });
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Navigate to the disabled `menuitem`
          const index = testItems.indexOf(disabledItem);
          for (let i = 0; i < index; i++) await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(disabledItem);

          // Pressing `Enter` does not select it, and the `menu` remains open
          const eventPromise = waitForMenuSelect();
          await page.keyboard.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menubutton).not.toBeFocused();
          await expect(menu).toHaveActiveItem(disabledItem);

          const error = await eventPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });
      });

      it.describe("SpaceBar (' ')", () => {
        it("Selects the currently-focused `menuitem` and closes the `menu`, then focuses the `menubutton`", async ({
          page,
        }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu", { includeHidden: true });
          const menubutton = page.getByRole("button");

          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Navigate to a random `menuitem`
          const item = getRandomItem(testItems);
          const index = testItems.indexOf(item);
          for (let i = 0; i < index; i++) await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(item);

          // Pressing `SpaceBar` selects the active `menuitem`, dispatching a `menuselect` with its Action ID
          const itemElement = menu.getByRole("menuitem", { name: item, includeHidden: true });
          await expect(itemElement).toBeVisible();

          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect");
          const [[event]] = await Promise.all([waitForMenuSelect(), page.keyboard.press(" ")]);
          await expect(itemElement).toHaveAttribute(attrs["data-action"], event.detail);
          await expect(itemElement).toHaveAttribute(attrs["data-action"], item.toLowerCase());

          // Selection closes the `menu` and returns focus to the `menubutton`
          await expect(menubutton).not.toBeExpanded();
          await expect(menubutton).toBeFocused();
        });

        it("Does not select a `menuitem` that is disabled", async ({ page }) => {
          const disabledItem = getRandomItem(testItems);
          const menuitems = testItems.map((name) => ({ name, disabled: name === disabledItem }));
          await renderDefaultHTMLToPage(page, { menuitems });
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Navigate to the disabled `menuitem`
          const index = testItems.indexOf(disabledItem);
          for (let i = 0; i < index; i++) await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(disabledItem);

          // Pressing `SpaceBar` does not select it, and the `menu` remains open
          const eventPromise = waitForMenuSelect();
          await page.keyboard.press(" ");
          await expect(menubutton).toBeExpanded();
          await expect(menubutton).not.toBeFocused();
          await expect(menu).toHaveActiveItem(disabledItem);

          const error = await eventPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });

        it("Prevents unwanted page scrolling", async ({ page }) => {
          /* ---------- Setup ---------- */
          // Render with the first `menuitem` disabled so we can exercise BOTH the disabled AND enabled scenarios
          const menuitems = testItems.map((name, i) => ({ name, disabled: i === 0 }));
          await renderDefaultHTMLToPage(page, { menuitems, testPageScroll: "bottom" });
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu");

          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // `SpaceBar` on a DISABLED `menuitem`: No selection, `menu` stays open, no page scrolling
          await page.keyboard.press(" ");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);

          // `SpaceBar` on an ENABLED `menuitem`: Selection + Collapse, but there's still no page scrolling
          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(testItems[1]);

          await page.keyboard.press(" ");
          await expect(menubutton).not.toBeExpanded();
          await new Promise((resolve) => setTimeout(resolve, 250)); // Wait for **possible** scrolling to finish
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });
      });

      it.describe("Typeahead Functionality (via Printable Characters)", () => {
        if (process.env.CI) it.describe.configure({ retries: 5 });

        /** The amount of time, in `milliseconds`, after which the `menu` search string is reset. (See Source) */
        const timeout = 500;

        /** The fraction by which the {@link timeout} should be increased (or decreased) to avoid test flakiness. */
        const fraction = 0.3;

        it("Moves focus to the NEXT matching `menuitem`", async ({ page }) => {
          /* ---------- Setup ---------- */
          const [first, second, , , , sixth, seventh] = testItems;
          const S = second.charAt(0) as "S";
          expect(testItems.filter((item) => item.startsWith(S)).length).toBeGreaterThan(1);

          // Render DOM and Expand `menu`
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(first);

          /* ---------- Assertions ---------- */
          // Each fresh "S" moves to the NEXT `menuitem` that starts with "S"
          await page.keyboard.press(S, { delay: timeout * (1 + fraction) });
          await expect(menu).toHaveActiveItem(second);
          await expect(menu).not.toHaveActiveItem(first);

          await page.keyboard.press(S, { delay: timeout * (1 + fraction) });
          await expect(menu).toHaveActiveItem(sixth);
          await expect(menu).not.toHaveActiveItem(second);

          await page.keyboard.press(S, { delay: timeout * (1 + fraction) });
          await expect(menu).toHaveActiveItem(seventh);
          await expect(menu).not.toHaveActiveItem(sixth);

          // Wraps back to the earliest match once the last match is passed
          await page.keyboard.press(S);
          await expect(menu).toHaveActiveItem(second);
          await expect(menu).not.toHaveActiveItem(seventh);
        });

        it("Matches `menuitem`s case-insensitively", async ({ page }) => {
          /* ---------- Setup ---------- */
          const lowercase = "lowercase";
          const UPPERCASE = "UPPERCASE";
          const itemNames = ["0-initial-item-0", lowercase, UPPERCASE] as const;
          const menuitems = itemNames.map((name) => ({ name }));
          await renderDefaultHTMLToPage(page, { menuitems });

          // Expand `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(itemNames[0]);

          /* ---------- Assertions ---------- */
          // Use an "Uppercase Search" for the "Lowercase Item"
          const uppercaseSearch = "L";
          expect(lowercase[0]).not.toBe(uppercaseSearch);

          await page.keyboard.press(uppercaseSearch, { delay: timeout * (1 + fraction) });
          await expect(menu).toHaveActiveItem(lowercase);

          // Use a "Lowercase Search" for the "Uppercase Item"
          const lowercaseSearch = "u";
          expect(UPPERCASE[0]).not.toBe(lowercaseSearch);

          await page.keyboard.press(lowercaseSearch);
          await expect(menu).toHaveActiveItem(UPPERCASE);
          await expect(menu).not.toHaveActiveItem(lowercase);
        });

        it("Matches substrings and entire words", async ({ page }) => {
          /* ---------- Setup ---------- */
          const second = testItems[1];
          expect(testItems.filter((item) => item.slice(0, 2) === second.slice(0, 2)).length).toBeGreaterThan(1);
          await renderDefaultHTMLToPage(page);

          // Expand `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          /* ---------- Assertions ---------- */
          // First, `Second` matches
          await page.keyboard.press(second[0]);
          await expect(menu).toHaveActiveItem(testItems[1]);

          // Then `Seventh` matches
          await page.keyboard.press(second[1]);
          await expect(menu).toHaveActiveItem(testItems[6]);
          await expect(menu).not.toHaveActiveItem(testItems[1]);

          // As we complete the word `Second`, we wrap back to it, and only `Second` matches from now on
          for (let i = 2; i < second.length; i++) {
            await page.keyboard.press(second[i]);
            await expect(menu).toHaveActiveItem(testItems[1]);
            await expect(menu).not.toHaveActiveItem(testItems[6]);
          }
        });

        it('Matches `menuitem`s that have spaces (" ") in them', async ({ page }) => {
          /* ---------- Setup ---------- */
          const first = testItems[0];
          const second = testItems[1];
          const spacedName = `Choose ${first} or ${second}` as const;
          const itemNames = [spacedName, ...testItems] as const;
          const menuitems = itemNames.map((name) => ({ name }));
          await renderDefaultHTMLToPage(page, { menuitems, testPageScroll: "bottom" });

          // Verify that our test `menuitem` has a space and includes other `menuitem`s as substrings
          expect(spacedName).toMatch(/\s+/);
          const segments = spacedName.split(" ");
          expect(segments.length).toBeGreaterThan(1);
          expect(segments[1].charAt(0)).toBe(first.charAt(0));
          expect((segments.at(-1) as string).charAt(0)).toBe(second.charAt(0));

          // Expand `menu`
          const menu = page.getByRole("menu", { includeHidden: true });
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(spacedName);
          const initialScrollDistance = await page.evaluate(getWindowScrollDistance);

          /* ---------- Assertions ---------- */
          // Search for the `menuitem` that has an empty string in its accessible name
          await page.keyboard.type(segments[0]);
          await expect(menu).toHaveActiveItem(spacedName);

          // A space is treated as part of the search (NOT a selection) while a search is active
          await page.keyboard.press(" ");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(spacedName);

          // Matching continues across the space
          await page.keyboard.press(first.charAt(0));
          await expect(menu).toHaveActiveItem(spacedName);
          await expect(menu).not.toHaveActiveItem(first);

          // Test filling out the rest of the `menuitem`'s accessible name
          await page.keyboard.type(spacedName.slice(segments[0].length + 2));
          await expect(menu).toHaveActiveItem(spacedName);
          await expect(menu).not.toHaveActiveItem(first);
          await expect(menu).not.toHaveActiveItem(second);

          // Once the search resets, `SpaceBar` selects the active `menuitem` and closes the `menu`
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect");
          await page.waitForTimeout(timeout * (1 + fraction));
          const spacedNameElement = menu.getByRole("menuitem", { name: spacedName, includeHidden: true });
          const spacedNameKebabCase = spacedName.toLowerCase().replaceAll(" ", "-");

          await expect(spacedNameElement).toBeVisible();
          const [[event]] = await Promise.all([waitForMenuSelect(), page.keyboard.press(" ")]);
          await expect(spacedNameElement).toHaveAttribute(attrs["data-action"], event.detail);
          await expect(spacedNameElement).toHaveAttribute(attrs["data-action"], spacedNameKebabCase);
          await expect(menubutton).not.toBeExpanded();
          await expect(menubutton).toBeFocused();

          // `SpaceBar` shouldn't have caused scrolling a single time during that entire interaction
          expect(await page.evaluate(getWindowScrollDistance)).toStrictEqual(initialScrollDistance);
        });

        it("Skips non-`menuitem`s (e.g., `separator`s and `Comment`s) during searching", async ({ page }) => {
          /* ---------- Setup ---------- */
          const [first, second, , , , sixth, seventh] = testItems;
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${createMenuItem({ name: second })}
              <hr />
              ${createMenuItem({ name: sixth })}
              ${createMenuItem({ name: first })}
              <hr />
              <!-- The separator above is even further out! -->
              ${createMenuItem({ name: seventh })}
            </menu-element>
          `;

          // Expand `menu`
          const menu = page.getByRole("menu", { includeHidden: true });
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(second);

          // Verify that the `menu` contains an HTML `Comment`. (Playwright Playback won't make it obvious.)
          const menuHasHTMLComment = await menu.evaluate((element: MenuElement) => {
            return Array.prototype.some.call(element.childNodes, (node: Node) => node.nodeType === Node.COMMENT_NODE);
          });
          expect(menuHasHTMLComment).toBe(true);

          /* ---------- Assertions ---------- */
          // Searching skips the immediately-adjacent `separator`
          await page.keyboard.press(seventh.charAt(0));
          await expect(menu).toHaveActiveItem(sixth);
          await expect(menu).not.toHaveActiveItem(second);

          // Searching successfully skips `separator`s/`Comment`s that appear further out as well
          await page.keyboard.press(seventh.charAt(1));
          await expect(menu).toHaveActiveItem(seventh);
          await expect(menu).not.toHaveActiveItem(sixth);
          await expect(menu).not.toHaveActiveItem(second);
        });

        it("Includes disabled `menuitem`s in the search results", async ({ page }) => {
          // Setup
          const [first, second] = testItems;
          const menuitems = testItems.map((name) => ({ name, disabled: name === second }));
          await renderDefaultHTMLToPage(page, { menuitems });

          // Expand `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(first);

          // Activate `Second` by searching for it
          await page.keyboard.press(second.charAt(0));
          await expect(menu).toHaveActiveItem(second);
          await expect(menu.getByRole("menuitem", { name: second })).toBeDisabled();
        });

        it(`Resets the search string when ${timeout}ms of inactivity have passed`, async ({ page }) => {
          /* ---------- Setup ---------- */
          const seventh = testItems[6];
          await renderDefaultHTMLToPage(page);

          // Expand the `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          /* ---------- Assertions ---------- */
          // `Second` is found first
          await page.keyboard.press(seventh[0], { delay: timeout * (1 - fraction) });
          await expect(menu).toHaveActiveItem(testItems[1]);

          // Then `Seventh`
          for (let i = 1; i < 3; i++) {
            await page.keyboard.press(seventh[i], { delay: timeout * (1 - fraction) });
            await expect(menu).toHaveActiveItem(testItems[6]);
            await expect(menu).not.toHaveActiveItem(testItems[1]);
          }

          // `Seventh` is still found because we've been typing fast enough
          await page.keyboard.press(seventh[3], { delay: timeout * (1 + fraction) });
          await expect(menu).toHaveActiveItem(testItems[6]);

          // After an extended delay, the `n` in `Seventh` actually matches `Ninth` because the search string was reset
          await page.keyboard.press(seventh[4]);
          await expect(menu).toHaveActiveItem(testItems[8]);
          await expect(menu).not.toHaveActiveItem(testItems[6]);
        });

        it("Resets the search string when no match is found", async ({ page }) => {
          /* ---------- Setup ---------- */
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          /* ---------- Assertions ---------- */
          // The next `menuitem` starting with "F" (Fourth) is found initially
          const F = testItems[3].charAt(0) as "F";
          await page.keyboard.press(F);
          await expect(menu).toHaveActiveItem(testItems[3]);

          // Nothing is found for "FF", so the active `menuitem` DOES NOT change
          await page.keyboard.press(F);
          await expect(menu).toHaveActiveItem(testItems[3]);

          // Because the search string was reset, it becomes "t" instead of "FFt", resulting in a match
          await page.keyboard.press("t");
          await expect(menu).toHaveActiveItem(testItems[9]);
          await expect(menu).not.toHaveActiveItem(testItems[3]);
        });

        it("Resets the search string when closed", async ({ page }) => {
          // Note: These Keyboard Interactions must be done WITHOUT any delays to ensure it is reliable.
          await renderDefaultHTMLToPage(page);
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect");

          const menu = page.getByRole("menu", { includeHidden: true });
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Begin searching for `Second` (`S-e-c-o`)
          const second = testItems[1];
          const indexOfLetterN = 4;
          await page.keyboard.type(second.slice(0, indexOfLetterN));
          await expect(menu).toHaveActiveItem(second);

          // Close the `menu` by selecting `Second`
          const secondElement = menu.getByRole("menuitem", { name: second, includeHidden: true });
          await expect(secondElement).toBeVisible();

          const [[event]] = await Promise.all([waitForMenuSelect(), page.keyboard.press("Enter")]);
          await expect(secondElement).toHaveAttribute(attrs["data-action"], event.detail);
          await expect(secondElement).toHaveAttribute(attrs["data-action"], second.toLowerCase());
          await expect(menubutton).not.toBeExpanded();
          await expect(menubutton).toBeFocused();

          // Reopen the `menu`
          await menubutton.press("Enter");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // The search string was reset on close, so "n" matches `Ninth` (NOT continuing "Secon...")
          await page.keyboard.press(second.charAt(indexOfLetterN));
          await expect(menu).toHaveActiveItem(testItems[8]);
          await expect(menu).not.toHaveActiveItem(second);
        });

        // NOTE: This isn't truly important to test, but it can be helpful for ensuring we avoid unexpected bugs.
        it("Ignores characters typed with `Alt`/`Ctrl`/`Meta` modifiers", async ({ page }) => {
          // Setup
          const first = testItems[0];
          const second = testItems[1];
          await renderDefaultHTMLToPage(page);

          // Expand `menu`
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(first);
          await expect(menu).not.toHaveActiveItem(second);

          // Characters typed with a modifier are ignored
          const S = "S";
          expect(second.charAt(0)).toBe(S);

          await page.keyboard.press(`Alt+${S}`);
          await expect(menu).toHaveActiveItem(first);

          await page.keyboard.press(`Control+${S}`);
          await expect(menu).toHaveActiveItem(first);

          await page.keyboard.press(`Meta+${S}`);
          await expect(menu).toHaveActiveItem(first);

          // Without a modifier, Typeahead still works
          await page.keyboard.press(S);
          await expect(menu).toHaveActiveItem(second);
          await expect(menu).not.toHaveActiveItem(first);
        });
      });
    });

    it.describe("Focus Management", () => {
      if (process.env.CI) it.describe.configure({ retries: 5 });

      /*
       * NOTE: Arguably, this test is redundant because of `expect.toHaveActiveItem()`, but it still allows us to be more
       * clearly explicit about what our expectations are regarding how User Interactions impact `:focus()` and `tabindex`.
       */
      it("Applies a roving `tabindex` to the `menuitem`s (0 on the focused item, -1 on the rest)", async ({ page }) => {
        const tabindex = "tabindex";
        const menubutton = page.getByRole("button");
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitems = menu.getByRole("menuitem", { includeHidden: true });

        await it.step("With Keyboard Interactions", async () => {
          await renderDefaultHTMLToPage(page, { menuitems: testItems.map((name) => ({ name })) });
          await expect(menuitems).toHaveCount(testItems.length);
          expect(testItems.length).toBeGreaterThan(5); // We have enough test items
          expect(new Set(testItems).size).toBe(testItems.length); // And every item is unique

          // All `menuitem`s start out unfocusable
          await expect(menuitems.and(menu.locator(`:not([${tabindex}="${-1}"])`))).toHaveCount(0);

          // Opening the `menu` activates the first `menuitem`
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);
          await expect(menuitems.first()).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === testItems[0] ? 0 : -1);
          }

          // `ArrowDown` rolls the active `menuitem` (and thus the `tabindex="0"`) forward through every `menuitem`
          for (let i = 1; i < testItems.length; i++) {
            await page.keyboard.press("ArrowDown");
            await expect(menu).toHaveActiveItem(testItems[i]);
            await expect(menu).not.toHaveActiveItem(testItems[i - 1]);

            const activeItemName = testItems[i];
            await expect(menu.getByRole("menuitem", { name: activeItemName })).toBeFocused();
            for (const menuitem of await menuitems.all()) {
              const name = (await menuitem.textContent()) as string;
              await expect(menuitem).toHaveJSProperty("tabIndex", name === activeItemName ? 0 : -1);
            }
          }

          // Pressing `ArrowDown` on the LAST `menuitem` changes nothing
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          await expect(menuitems.last()).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === testItems.at(-1) ? 0 : -1);
          }

          // `ArrowUp` rolls the active `menuitem` backward through every `menuitem`
          for (let i = testItems.length - 2; i >= 0; i--) {
            await page.keyboard.press("ArrowUp");
            await expect(menu).toHaveActiveItem(testItems[i]);
            await expect(menu).not.toHaveActiveItem(testItems[i + 1]);

            const activeItemName = testItems[i];
            await expect(menu.getByRole("menuitem", { name: activeItemName })).toBeFocused();
            for (const menuitem of await menuitems.all()) {
              const name = (await menuitem.textContent()) as string;
              await expect(menuitem).toHaveJSProperty("tabIndex", name === activeItemName ? 0 : -1);
            }
          }

          // Pressing `ArrowUp` on the FIRST `menuitem` changes nothing
          await expect(menu).toHaveActiveItem(testItems[0]);
          await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem(testItems[0]);
          await expect(menuitems.first()).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === testItems[0] ? 0 : -1);
          }

          // `End` makes the last `menuitem` active
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          await expect(menu).not.toHaveActiveItem(testItems[0]);
          await expect(menuitems.last()).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === testItems.at(-1) ? 0 : -1);
          }

          // `Home` makes the first `menuitem` active
          await page.keyboard.press("Home");
          await expect(menu).toHaveActiveItem(testItems[0]);
          await expect(menu).not.toHaveActiveItem(testItems.at(-1) as string);
          await expect(menuitems.first()).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === testItems[0] ? 0 : -1);
          }

          // Typeahead (`S-e-c-o`, typed WITHOUT delays) rolls the active `menuitem` to the matching item on every keypress
          const second = testItems[1];
          const seventh = testItems[6];
          const search = second.slice(0, 4); // "Seco"
          for (let i = 0; i < search.length; i++) {
            const letter = search[i];
            const activeItemName = letter === "e" ? seventh : second;

            await page.keyboard.press(search[i]);
            await expect(menu).toHaveActiveItem(activeItemName);
            await expect(menu.getByRole("menuitem", { name: activeItemName })).toBeFocused();

            for (const menuitem of await menuitems.all()) {
              const name = (await menuitem.textContent()) as string;
              await expect(menuitem).toHaveJSProperty("tabIndex", name === activeItemName ? 0 : -1);
            }
          }

          // Closing the `menu` makes every `menuitem` unfocusable again
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();
          await expect(menuitems.and(menu.locator(`:not([${tabindex}="${-1}"])`))).toHaveCount(0);

          // Reopening resets the search string, so typing "n" activates `Ninth` (NOT continuing "Secon...")
          const ninth = testItems[8];
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          await page.keyboard.press(ninth.charAt(0));
          await expect(menu).toHaveActiveItem(ninth);
          await expect(menu).not.toHaveActiveItem(second);
          await expect(menu.getByRole("menuitem", { name: ninth })).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === ninth ? 0 : -1);
          }

          // Close the `menu` in preparation for the Mouse Interaction tests
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();
        });

        await it.step("With Mouse Interactions", async () => {
          // The `menu` is still closed from the previous step, so every `menuitem` remains unfocusable
          await expect(menubutton).not.toBeExpanded();
          await expect(menuitems.and(menu.locator(`:not([${tabindex}="${-1}"])`))).toHaveCount(0);

          // Clicking the `menubutton` opens the `menu` and activates the first `menuitem`
          await menubutton.click();
          await expect(menu).toHaveActiveItem(testItems[0]);
          await expect(menuitems.first()).toBeFocused();

          for (const menuitem of await menuitems.all()) {
            const name = (await menuitem.textContent()) as string;
            await expect(menuitem).toHaveJSProperty("tabIndex", name === testItems[0] ? 0 : -1);
          }

          // Hovering a `menuitem` rolls the active `menuitem` to that item
          // Start at the 2nd item and wrap back to the 1st one for test reliability
          const startIndex = 1;
          for (let i = startIndex; i < testItems.length + startIndex; i++) {
            const activeItemName = testItems[i % testItems.length];
            await menu.getByRole("menuitem", { name: activeItemName }).hover();
            await expect(menu).toHaveActiveItem(activeItemName);
            await expect(menu.getByRole("menuitem", { name: activeItemName })).toBeFocused();

            for (const menuitem of await menuitems.all()) {
              const name = (await menuitem.textContent()) as string;
              await expect(menuitem).toHaveJSProperty("tabIndex", name === activeItemName ? 0 : -1);
            }
          }

          // Clicking the `menubutton` again collapses the `menu`, making every `menuitem` unfocusable again
          await menubutton.click();
          await expect(menubutton).not.toBeExpanded();
          await expect(menuitems.and(menu.locator(`:not([${tabindex}="${-1}"])`))).toHaveCount(0);
        });
      });

      it("Closes the `menu` when focus moves outside of it", async ({ page, browserName }) => {
        /*
         * NOTE: For some reason, Firefox in Playwright attempts to focus the `MenuElement` when backwards `Tab`bing
         * from a `menuitem` to the controlling `menubutton`. This behavior isn't observed in **_any_** real browsers
         * on our machine (including Firefox), nor in Playwright's other Test Browsers. So for now, we're circumventing
         * this issue by applying `tabindex="-1"`, but **_only_** for Firefox and **_only_** in this test. We need to
         * do more investigation to figure out if this is a Playwright bug or real Firefox behavior.
         *
         * Note: This is different from the `Combobox` component, where **_real_** Safari would **_also_** try to focus
         * the `listbox` unless `[tabindex="-1"]` was applied. Playwright Safari caught that bug/issue/inconvenience, and
         * we addressed it. But this issue is only observed in tests at this time and therefore shouldn't affect our
         * production code. We really need "https://github.com/WICG/webcomponents/issues/762" to be addressed.
         */

        /* ---------- Setup ---------- */
        await page.goto(url);
        await renderHTMLToPage(page)`
          ${createMenuButton()}
          <menu-element
            id="${defaultMenuId}"
            menubutton="${defaultMenuButtonId}"
            ${browserName === "firefox" ? 'tabindex="-1"' : ""}
          >
            ${testItems.map((name) => createMenuItem({ name })).join("")}
          </menu-element>
          <input type="text" />
        `;

        const input = page.getByRole("textbox");
        const menubutton = page.getByRole("button");
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitems = menu.getByRole("menuitem", { includeHidden: true });
        await expect(menuitems).toHaveCount(testItems.length);

        await it.step("Forward Tabbing", async () => {
          // Expand `menu`
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // `Tab` Forwards
          await page.keyboard.press("Tab");
          await expect(input).toBeFocused();
          await expect(menubutton).not.toBeExpanded();

          // Focus did NOT move to the next `menuitem` (or any other `menuitem`)
          for (const menuitem of await menuitems.all()) {
            await expect(menuitem).not.toBeFocused();
            await expect(menuitem).toHaveJSProperty("tabIndex", -1);
          }
        });

        await it.step("Backward Tabbing", async () => {
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Move the active `menuitem` down first, so that a Backwards `Tab` MUST skip a preceding `menuitem`
          await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem(testItems[1]);
          await expect(menu).not.toHaveActiveItem(testItems[0]);

          // `Tab` Backwards
          await page.keyboard.press("Shift+Tab");
          await expect(menubutton).toBeFocused();
          await expect(menubutton).not.toBeExpanded();

          // Focus did NOT move to the previous `menuitem` (or any other `menuitem`)
          for (const menuitem of await menuitems.all()) {
            await expect(menuitem).not.toBeFocused();
            await expect(menuitem).toHaveJSProperty("tabIndex", -1);
          }
        });

        await it.step("Programmatic Focus Changes", async () => {
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          // Programmatically `focus`ing a different element closes the `menu`
          await input.focus();
          await expect(input).toBeFocused();
          await expect(menubutton).not.toBeExpanded();

          for (const menuitem of await menuitems.all()) {
            await expect(menuitem).not.toBeFocused();
            await expect(menuitem).toHaveJSProperty("tabIndex", -1);
          }

          // As does programmatically `blur`ring the active `menuitem`
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem(testItems[0]);

          await menuitems.first().blur();
          expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
          await expect(menubutton).not.toBeExpanded();

          for (const menuitem of await menuitems.all()) {
            await expect(menuitem).not.toBeFocused();
            await expect(menuitem).toHaveJSProperty("tabIndex", -1);
          }
        });
      });
    });

    it.describe("Menu Scrolling Functionality", () => {
      it("Scrolls the active `menuitem` into view if needed", async ({ page, browserName }) => {
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu");
        const menubutton = page.getByRole("button");
        const menuitems = menu.getByRole("menuitem");

        await it.step("Keyboard Interactions", async () => {
          // Opening the `menu` shows the first `menuitem`; the last one is scrolled out of view
          await menubutton.press("Enter");
          await expect(menu).toHaveActiveItem((await menuitems.first().textContent()) as string);
          await expect(menuitems.first()).toBeInViewport();
          await expect(menuitems.last()).not.toBeInViewport();

          // `End` scrolls the last `menuitem` into view (pushing the first one out of view)
          await page.keyboard.press("End");
          await expect(menu).toHaveActiveItem((await menuitems.last().textContent()) as string);
          await expect(menuitems.last()).toBeInViewport();
          await expect(menuitems.first()).not.toBeInViewport();

          // `Home` scrolls the first `menuitem` back into view
          await page.keyboard.press("Home");
          await expect(menu).toHaveActiveItem((await menuitems.first().textContent()) as string);
          await expect(menuitems.first()).toBeInViewport();
          await expect(menuitems.last()).not.toBeInViewport();

          // `ArrowDown` progressively scrolls lower `menuitem`s into view until the last one is reached
          for (let i = 1; i < testItems.length; i++) await page.keyboard.press("ArrowDown");
          await expect(menu).toHaveActiveItem((await menuitems.last().textContent()) as string);
          await expect(menuitems.last()).toBeInViewport();
          await expect(menuitems.first()).not.toBeInViewport();

          // `ArrowUp` progressively scrolls upper `menuitem`s back into view until the first one is reached
          for (let i = 1; i < testItems.length; i++) await page.keyboard.press("ArrowUp");
          await expect(menu).toHaveActiveItem((await menuitems.first().textContent()) as string);
          await expect(menuitems.first()).toBeInViewport();
          await expect(menuitems.last()).not.toBeInViewport();

          // Close the `menu` in preparation for the Mouse Interaction tests
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();
        });

        /*
         * NOTE: For some reason, Firefox in Playwright DOES NOT scroll a `menuitem` element into view when it
         * is focused via `HTMLElement.focus()` in response to a _valid_ mouse hover. The tests below legitimately
         * trigger the `pointerover` event handler in Playwright's Firefox and even update the `document.activeElement`.
         * Nonetheless, for some reason, scrolling does not happen in response to this.
         *
         * Even more interesting is the fact that no issues are observed for REAL browsers on our machine
         * (including Firefox), nor are any problems observed for Playwright's other Test Browsers.
         * Thus, this is yet another situation that _seems_ like it might be a Playwright Firefox bug that
         * needs to be investigated/resolved.
         *
         * Since this hasn't been proven to be a real bug in a real browser yet, we aren't going to address this
         * in our production code; we're just going to skip the `Mouse` portion of the tests -- for Firefox only, for now.
         */
        if (browserName === "firefox") return;
        await it.step("Mouse Interactions", async () => {
          // Expand the `menu`
          await menubutton.click();
          await expect(menu).toHaveActiveItem((await menuitems.first().textContent()) as string);
          await expect(menuitems.first()).toBeInViewport();

          // Gather/Configure information about `menu`/`menuitem` dimensions
          const displayCount = 4;
          await menu.evaluate((e, blocks) => e.style.setProperty("--blocks", `${blocks}`), displayCount);
          const { height: menuitemHeight } = await menuitems.first().evaluate((node) => node.getBoundingClientRect());

          // Verify current scroll state based on our configuration
          await expect(menuitems.first()).toBeInViewport({ ratio: 1 });
          await expect(menuitems.nth(displayCount - 1)).toBeInViewport({ ratio: 1 });
          await expect(menuitems.nth(displayCount)).not.toBeInViewport();

          // Partially scroll next item into view
          await menu.evaluate((node, top) => node.scrollBy({ top }), menuitemHeight / 2);
          await expect(menuitems.first()).toBeInViewport();
          await expect(menuitems.first()).not.toBeInViewport({ ratio: 1 });
          await expect(menuitems.nth(displayCount - 1)).toBeInViewport({ ratio: 1 });
          await expect(menuitems.nth(displayCount)).toBeInViewport();
          await expect(menuitems.nth(displayCount)).not.toBeInViewport({ ratio: 1 });

          // Hover the partially-revealed `menuitem` indicated by the `displayCount` to cause scrolling
          {
            const rect = await menuitems.nth(displayCount).evaluate((node) => node.getBoundingClientRect());
            await page.mouse.move(rect.left + rect.width / 2, rect.top + rect.height / 4);
            await expect(menuitems.nth(displayCount)).toBeInViewport({ ratio: 1 });
            await expect(menuitems.first()).not.toBeInViewport();
          }

          // Move mouse back outside the `menu` to avoid disrupting scrolling
          await page.mouse.move(0, 0);

          // Scroll the `menu` so that the `displayCount` `menuitem` is at the bottom
          await menuitems.nth(displayCount).evaluate((node) => node.scrollIntoView({ block: "end" }));
          await expect(menuitems.nth(displayCount)).toBeInViewport({ ratio: 1 });
          await expect(menuitems.nth(displayCount - 1)).toBeInViewport({ ratio: 1 });
          await expect(menuitems.first()).not.toBeInViewport();

          // Now partially scroll first item into view
          await menu.evaluate((node, top) => node.scrollBy({ top }), -menuitemHeight / 2);
          await expect(menuitems.nth(displayCount)).toBeInViewport();
          await expect(menuitems.nth(displayCount)).not.toBeInViewport({ ratio: 1 });
          await expect(menuitems.nth(displayCount - 1)).toBeInViewport({ ratio: 1 });
          await expect(menuitems.first()).toBeInViewport();
          await expect(menuitems.first()).not.toBeInViewport({ ratio: 1 });

          // Cause scrolling to occur by hovering the first `menuitem`, which is now partially-revealed
          {
            const rect = await menuitems.first().evaluate((node) => node.getBoundingClientRect());
            await page.mouse.move(rect.left + rect.width / 2, rect.bottom - rect.height / 4);
            await expect(menuitems.first()).toBeInViewport({ ratio: 1 });
            await expect(menuitems.nth(displayCount - 1)).toBeInViewport({ ratio: 1 });
            await expect(menuitems.nth(displayCount)).not.toBeInViewport();
          }
        });
      });
    });
  });

  it.describe("API", () => {
    it.describe("Exposed Properties and Attributes", () => {
      it.describe("menubutton (Attribute)", () => {
        it("Identifies the `menubutton` that controls the `menu`, and registers its handlers", async ({ page }) => {
          /* ---------- Setup ---------- */
          // Render a `<button>` and a `<menu-element>` that are NOT yet associated with each other
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" openwitharrows>
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu", { includeHidden: true });

          /* ---------- Assertions ---------- */
          // Without an association, the `menubutton`'s handlers aren't registered, so interactions do nothing
          await expect(menu).toHaveJSProperty("menuButtonElement", null);

          // Clicking does nothing
          await menubutton.click();
          await expect(menubutton).not.toBeExpanded();

          // Keyboard Interactions do nothing
          for (const key of ["Enter", " ", "ArrowUp", "ArrowDown"]) {
            await menubutton.press(key);
            await expect(menubutton).not.toBeExpanded();
          }

          // Programmatic `aria-expanded` state alterations do nothing
          // NOTE: `toBeExpanded()` check doesn't work here because of how it validates the `aria-expanded` attribute.
          await menubutton.evaluate((node) => (node.ariaExpanded = String(true)));
          await expect(menu).not.toBeVisible();
          for (const child of await menu.locator("*").all()) await expect(child).not.toBeVisible();

          // Restore original `aria-expanded` state for later tests
          await menubutton.evaluate((node) => (node.ariaExpanded = String(false)));

          // Associate the `menu` with the `menubutton` to register its handlers
          await menu.evaluate((node, id) => node.setAttribute("menubutton", id), defaultMenuButtonId);
          expect(await menu.evaluate((node: MenuElement) => node.menuButtonElement)).toBeTruthy();

          // Clicking the `menubutton` now works
          await menubutton.click();
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          await menubutton.click();
          await expect(menubutton).not.toBeExpanded();

          // Keyboard-opening the `menubutton` now works
          for (const key of ["Enter", " ", "ArrowUp", "ArrowDown"] as const) {
            await menubutton.press(key);
            await expect(menubutton).toBeExpanded();
            await expect(menu).toHaveActiveItem(key === "ArrowUp" ? (testItems.at(-1) as string) : testItems[0]);

            await page.keyboard.press("Escape");
            await expect(menubutton).not.toBeExpanded();
          }

          // Manipulating `aria-expanded` directly also works now
          await menubutton.evaluate((node) => (node.ariaExpanded = String(true)));
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          await menubutton.evaluate((node) => (node.ariaExpanded = String(false)));
          await expect(menubutton).not.toBeExpanded();
        });

        it("Unregisters stale/obsolete handlers when the `menubutton` changes", async ({ page }) => {
          /* ---------- Setup ---------- */
          const buttonAId = "button-a";
          const buttonBId = "button-b";

          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton({ id: buttonAId, controls: defaultMenuId, children: "Button A" })}
            ${createMenuButton({ id: buttonBId, controls: defaultMenuId, children: "Button B" })}
            <menu-element id="${defaultMenuId}" menubutton="${buttonAId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const menu = page.getByRole("menu", { includeHidden: true });
          const buttonA = page.getByRole("button", { name: "Button A" });
          const buttonB = page.getByRole("button", { name: "Button B" });

          /* ---------- Assertions ---------- */
          // `Button A` controls the `menu` initially, not `Button B`
          await buttonB.click();
          await expect(buttonB).not.toBeExpanded();

          await buttonA.click();
          await expect(buttonA).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);
          await expect(buttonB).toHaveJSProperty("ariaExpanded", String(false));

          await buttonA.click();
          await expect(buttonA).not.toBeExpanded();

          // Now point the `menubutton` at `Button B` instead
          await menu.evaluate((node, id) => node.setAttribute("menubutton", id), buttonBId);

          // `Button A`'s handlers were unregistered, so it no longer controls the `menu`
          await buttonA.click();
          await expect(buttonA).not.toBeExpanded();

          await buttonB.click();
          await expect(buttonB).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);
          await expect(buttonA).toHaveJSProperty("ariaExpanded", String(false));

          await buttonB.click();
          await expect(buttonB).not.toBeExpanded();

          // Next, dissociate the `menu` from all `menubutton`s
          await menu.evaluate((node) => node.removeAttribute("menubutton"));

          // Now nothing can open the `menu` at all
          await buttonA.click();
          await expect(buttonA).not.toBeExpanded();

          await buttonB.click();
          await expect(buttonB).not.toBeExpanded();
        });

        it("Auto-collapses `menubutton`s when they are unregistered", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menu = page.getByRole("menu");
          const menubutton = page.getByRole("button");

          // Expand the `menu`
          await menubutton.click();
          await expect(menubutton).toBeExpanded();

          // Removing the association unregisters the `menubutton`, which force-collapses it
          await menu.evaluate((node) => node.removeAttribute("menubutton"));
          await expect(menubutton).not.toBeExpanded();
        });

        it("Does nothing if it does not point to a valid `<button>` by `id`", async ({ page }) => {
          /* ---------- Setup ---------- */
          const badId = "fake-menu-button";

          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton({ children: "Real Menu Button" })}
            <div
              id="${badId}"
              role="button"
              aria-controls="${defaultMenuId}"
              aria-expanded="false"
              aria-haspopup="menu"
              tabindex="0"
            >
              Fake Menu Button
            </div>
            <menu-element id="${defaultMenuId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const waitForNextError = createErrorWatcher(page, { timeout: 750 });
          const menu = page.getByRole("menu", { includeHidden: true });
          const menubutton = page.getByRole("button", { name: "Real Menu Button" });
          const fakeMenubutton = page.getByRole("button", { name: "Fake Menu Button" });

          /* ---------- Assertions ---------- */
          const errorPromise = waitForNextError();

          // 1) An `id` that points nowhere yields no association, so no event listeners are registered
          await menu.evaluate((node) => node.setAttribute("menubutton", Math.random().toString()));
          await expect(menu).toHaveJSProperty("menuButtonElement", null);

          await menubutton.click();
          await expect(menubutton).not.toBeExpanded();

          await fakeMenubutton.click();
          await expect(fakeMenubutton).not.toBeExpanded();

          // 2) An `id` that points to a non-`<button>` element yields no association either
          await menu.evaluate((node, id) => node.setAttribute("menubutton", id), badId);
          await expect(menu).toHaveJSProperty("menuButtonElement", null);

          await fakeMenubutton.click();
          await expect(fakeMenubutton).not.toBeExpanded();

          // 3) An `id` that points to a valid `<button>` finally works
          await menu.evaluate((node, id) => node.setAttribute("menubutton", id), defaultMenuButtonId);
          expect(await menu.evaluate((node: MenuElement) => node.menuButtonElement)).toBeTruthy();

          await menubutton.click();
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);

          // No errors were thrown by the browser during the above actions
          const error = await errorPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });
      });

      it.describe("menuButtonElement (Property)", () => {
        it("Returns the `HTMLButtonElement` referenced by the `menubutton` attribute", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu", { includeHidden: true });

          // The `menu`<-->`menubutton` association exists
          expect(await menu.evaluate((node: MenuElement) => node.menuButtonElement)).toBeTruthy();

          // Double-verify the association by checking the ID and `outerHTML` of the `button` from both points of view
          await expect(menubutton).toHaveId((await menu.getAttribute("menubutton")) as string);
          const outerHTML1 = await menubutton.evaluate((node) => node.outerHTML);
          const outerHTML2 = await menu.evaluate((node: MenuElement) => node.menuButtonElement?.outerHTML);
          expect(outerHTML1).toBe(outerHTML2);
        });

        it("Returns `null` when no valid `menubutton` is referenced", async ({ page }) => {
          /* ---------- Setup ---------- */
          const badId = "fake-menu-button";

          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton({ children: "Real Menu Button" })}
            <div
              id="${badId}"
              role="button"
              aria-controls="${defaultMenuId}"
              aria-expanded="false"
              aria-haspopup="menu"
              tabindex="0"
            >
              Fake Menu Button
            </div>
            <menu-element id="${defaultMenuId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          /* ---------- Assertions ---------- */
          // No `menubutton` attribute at all
          const menu = page.getByRole("menu", { includeHidden: true });
          await expect(menu).not.toHaveAttribute("menubutton");
          await expect(menu).toHaveJSProperty("menuButtonElement", null);

          // A `menubutton` attribute that points nowhere
          await menu.evaluate((node) => node.setAttribute("menubutton", Math.random().toString()));
          await expect(menu).toHaveJSProperty("menuButtonElement", null);

          // A `menubutton` attribute that points to a non-`<button>` element
          await menu.evaluate((node, id) => node.setAttribute("menubutton", id), badId);
          await expect(menu).toHaveJSProperty("menuButtonElement", null);
        });
      });

      it.describe("menuanchor (Attribute)", () => {
        it("Appends the `menu` to the element referenced by the attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const anchorId = "anchor";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <div id="${anchorId}">
              ${createMenuButton()}
            </div>
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const anchor = page.locator(`[id="${anchorId}"]`);
          const menu = page.getByRole("menu", { includeHidden: true });

          /* ---------- Assertions ---------- */
          // The `menu` starts out as a direct child of the `<body>`
          await expect(menu.and(page.locator("body > *"))).toBeAttached();
          await expect(menu.and(anchor.locator(":scope > *"))).not.toBeAttached();

          // Setting `menuanchor` appends the `menu` to the referenced element
          await menu.evaluate((node, id) => node.setAttribute("menuanchor", id), anchorId);
          await expect(menu.and(anchor.locator(":scope > :last-child"))).toBeAttached();
        });

        it("Re-anchors the `menu` when the attribute changes", async ({ page }) => {
          /* ---------- Setup ---------- */
          const anchor1Id = "anchor-1";
          const anchor2Id = "anchor-2";
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
            <div id="${anchor1Id}"></div>
            <div id="${anchor2Id}"></div>
          `;

          const anchor1 = page.locator(`[id="${anchor1Id}"]`);
          const anchor2 = page.locator(`[id="${anchor2Id}"]`);
          const menu = page.getByRole("menu", { includeHidden: true });

          await expect(menu.and(anchor1.locator(":scope > *"))).not.toBeAttached();
          await expect(menu.and(anchor2.locator(":scope > *"))).not.toBeAttached();

          /* ---------- Assertions ---------- */
          // Anchoring to the first element moves the `menu` into it
          await menu.evaluate((node, id) => node.setAttribute("menuanchor", id), anchor1Id);
          await expect(menu.and(anchor1.locator(":scope > :last-child"))).toBeAttached();
          await expect(menu.and(anchor2.locator(":scope > *"))).not.toBeAttached();

          // Changing the attribute re-anchors the `menu` to the second element
          await menu.evaluate((node, id) => node.setAttribute("menuanchor", id), anchor2Id);
          await expect(menu.and(anchor2.locator(":scope > :last-child"))).toBeAttached();
          await expect(menu.and(anchor1.locator(":scope > *"))).not.toBeAttached();
        });

        it("Does nothing if it does not point to a valid `HTMLElement` by `id`", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const waitForNextError = createErrorWatcher(page, { timeout: 500 });
          const menu = page.getByRole("menu", { includeHidden: true });
          const body = page.locator("body");

          /* ---------- Assertions ---------- */
          // The `menu` starts out as a direct child of the `<body>`
          const errorPromise = waitForNextError();
          await expect(menu.and(body.locator(":scope > *"))).toBeAttached();

          // An `id` that points nowhere yields no anchor, so the `menu` does not move
          await menu.evaluate((node) => node.setAttribute("menuanchor", "does-not-exist"));
          await expect(menu).toHaveJSProperty("menuAnchorElement", null);
          await expect(menu.and(body.locator(":scope > *"))).toBeAttached();

          // Of course, removing the `menuanchor` attribute doesn't change anything either
          await menu.evaluate((node) => node.removeAttribute("menuanchor"));
          await expect(menu).toHaveJSProperty("menuAnchorElement", null);
          await expect(menu.and(body.locator(":scope > *"))).toBeAttached();

          // No errors were thrown by the browser during the above actions
          const error = await errorPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });

        it('Does nothing if the `menu` is already a direct descendent of the "anchor element"', async ({ page }) => {
          const anchorId = "anchor";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <div id="${anchorId}">
              <menu-element aria-label="Pre-Anchored Menu"></menu-element>
              <section>
                <menu-element aria-label="Deep Menu"></menu-element>
              </section>
            </div>
          `;

          const anchor = page.locator(`[id="${anchorId}"]`);

          // A deeply-nested `menu` will be moved to become a direct descendant when anchored
          const deepMenu = page.getByRole("menu", { name: "Deep Menu", includeHidden: true });
          await expect(deepMenu.and(anchor.locator(":scope > *"))).not.toBeAttached();
          await expect(deepMenu.and(anchor.locator("*"))).toBeAttached();
          await expect(deepMenu).toHaveJSProperty("menuAnchorElement", null);

          await deepMenu.evaluate((node, id) => node.setAttribute("menuanchor", id), anchorId);
          await expect(deepMenu.and(anchor.locator(":scope > :last-child"))).toBeAttached();
          expect(await deepMenu.evaluate((node: MenuElement) => node.menuAnchorElement)).toBeTruthy();

          // But a `menu` which is already a direct descendant of the `anchor` WILL NOT be moved
          const preAnchoredMenu = page.getByRole("menu", { name: "Pre-Anchored Menu", includeHidden: true });
          await expect(preAnchoredMenu.and(anchor.locator(":scope > :last-child"))).not.toBeAttached();
          await expect(preAnchoredMenu.and(anchor.locator(":scope > *"))).toBeAttached();
          await expect(preAnchoredMenu).toHaveJSProperty("menuAnchorElement", null);

          await preAnchoredMenu.evaluate((node, id) => node.setAttribute("menuanchor", id), anchorId);
          await expect(preAnchoredMenu.and(anchor.locator(":scope > :last-child"))).not.toBeAttached();
          await expect(preAnchoredMenu.and(anchor.locator(":scope > *"))).toBeAttached();
          expect(await preAnchoredMenu.evaluate((node: MenuElement) => node.menuAnchorElement)).toBeTruthy();
        });
      });

      it.describe("menuAnchorElement (Property)", () => {
        it("Returns the `HTMLElement` referenced by the `menuanchor` attribute", async ({ page }) => {
          const anchorId = "anchor";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <div id="${anchorId}">
              ${createMenuButton()}
            </div>
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}" menuanchor="${anchorId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          // The `menu`<-->`menuanchor` association exists
          const menu = page.getByRole("menu", { includeHidden: true });
          expect(await menu.evaluate((node: MenuElement) => node.menuAnchorElement)).toBeTruthy();

          // Double-verify the association by checking the ID and `outerHTML` of the `button` from both points of view
          const anchor = page.locator(`[id="${anchorId}"]`);

          await expect(anchor).toHaveId((await menu.getAttribute("menuanchor")) as string);
          const outerHTML1 = await anchor.evaluate((node) => node.outerHTML);
          const outerHTML2 = await menu.evaluate((node: MenuElement) => node.menuAnchorElement?.outerHTML);
          expect(outerHTML1).toBe(outerHTML2);
        });

        it("Returns `null` when no valid `menuanchor` is referenced", async ({ page }) => {
          /* ---------- Setup ---------- */
          const badAnchorId = "bad-anchor";
          await page.goto(url);
          await renderHTMLToPage(page)`
            <svg id="${badAnchorId}" viewBox="0 0 100 100" width="100px">
              <circle cx="50%" cy="50%" r="50%" fill="red" />
            </svg>
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          /* ---------- Assertions ---------- */
          // No `menuanchor` attribute at all
          const menu = page.getByRole("menu", { includeHidden: true });
          await expect(menu).toHaveJSProperty("menuAnchorElement", null);

          // A `menuanchor` attribute that points nowhere
          await menu.evaluate((node) => node.setAttribute("menuanchor", Math.random().toString()));
          await expect(menu).toHaveJSProperty("menuAnchorElement", null);

          // A `menuanchor` attribute that points to a non-HTMLElement (e.g., an SVGElement)
          await menu.evaluate((node, id) => node.setAttribute("menuanchor", id), badAnchorId);
          await expect(page.locator(`[id="${badAnchorId}"]`)).toBeVisible();
          await expect(menu).toHaveJSProperty("menuAnchorElement", null);
        });
      });

      /*
       * From `MenuElement.js`:
       * > WARNING: If `openwitharrows` is changed, an open `menu` can be collapsed, unless we add a special edge-case guard
       * > like `keepOpen` for that scenario ...
       *
       * Keep this in mind while writing any tests related to `[openwitharrows]`.
       */
      it.describe("openWithArrows (Property)", () => {
        it("Exposes the underlying `openwitharrows` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}" openwitharrows>
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const menu = page.getByRole("menu", { includeHidden: true });
          await expect(menu).toHaveJSProperty("openWithArrows", true);

          // `attribute` responds to `property` updates
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = false));
          await expect(menu).not.toHaveAttribute("openwitharrows");

          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));
          await expect(menu).toHaveAttribute("openwitharrows", "");

          // `property` also responds to `attribute` updates
          await menu.evaluate((node) => node.removeAttribute("openwitharrows"));
          await expect(menu).toHaveJSProperty("openWithArrows", false);
        });

        it("Toggles the `menubutton`'s ArrowUp/ArrowDown event listeners when changed", async ({ page }) => {
          await renderDefaultHTMLToPage(page);
          const menubutton = page.getByRole("button");
          const menu = page.getByRole("menu", { includeHidden: true });

          // OFF (default): ArrowUp/ArrowDown DO NOT open the `menu`
          await expect(menu).toHaveJSProperty("openWithArrows", false);
          await menubutton.press("ArrowDown");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("ArrowUp");
          await expect(menubutton).not.toBeExpanded();

          // Turning it ON registers the ArrowKey listeners, so ArrowDown/ArrowUp now open the `menu`
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));

          await menubutton.press("ArrowDown");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("ArrowUp");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();

          // Turning it OFF again unregisters the ArrowKey listeners, so the arrows stop opening the `menu`
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = false));
          await menubutton.press("ArrowDown");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("ArrowUp");
          await expect(menubutton).not.toBeExpanded();

          // Finally, test rendering a `menu` that already has `openwitharrows` on mount
          await renderHTMLToPage(page)`
            ${createMenuButton()}
            <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}" openwitharrows>
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          await expect(menu).toHaveJSProperty("openWithArrows", true);

          await menubutton.press("ArrowDown");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems[0]);
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();

          await menubutton.press("ArrowUp");
          await expect(menubutton).toBeExpanded();
          await expect(menu).toHaveActiveItem(testItems.at(-1) as string);
          await page.keyboard.press("Escape");
          await expect(menubutton).not.toBeExpanded();
        });

        it("Does not crash if no `menubutton` is currently available", async ({ page }) => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <menu-element id="${defaultMenuId}">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const menu = page.getByRole("menu", { includeHidden: true });
          await expect(menu).toHaveJSProperty("menuButtonElement", null);
          const waitForNextError = createErrorWatcher(page, { timeout: 500 });

          // Toggling `openWithArrows` with no associated `menubutton` should not throw
          const errorPromise = waitForNextError();
          await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));
          await expect(menu).toHaveAttribute("openwitharrows", "");

          await menu.evaluate((node: MenuElement) => (node.openWithArrows = false));
          await expect(menu).not.toHaveAttribute("openwitharrows");

          const error = await errorPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });
      });
    });

    it.describe("Dispatched Events", () => {
      it.describe("menuselect", () => {
        it("Fires when a `menuitem` is selected, exposing the selected item's Action ID", async ({ page }) => {
          // Give the target `menuitem` an Action ID that differs from its name to prove that the ID (not the name) is exposed
          const action = "custom-action-id";
          const itemName = getRandomItem(testItems);
          const menuitems = testItems.map((name) => ({ name, action: name === itemName ? action : undefined }));

          expect(action).not.toBe(itemName);
          expect(action).not.toBe(itemName.toLowerCase());
          await renderDefaultHTMLToPage(page, { menuitems });
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { event: "CustomEvent" });

          // Expand the `menu`
          const menubutton = page.getByRole("button");
          await menubutton.click();
          await expect(menubutton).toBeExpanded();

          // Selecting the `menuitem` dispatches a `menuselect` event whose `detail` is the item's Action ID
          const menu = page.getByRole("menu", { includeHidden: true });
          const menuitem = menu.getByRole("menuitem", { name: itemName, includeHidden: true });
          const [events] = await Promise.all([waitForMenuSelect(), menuitem.click()]);

          expect(events).toHaveLength(1);
          expect(events[0].detail).toBe(action);
          await expect(menuitem).toHaveAttribute(attrs["data-action"], events[0].detail);
        });

        it("Does not fire when a disabled `menuitem` is selected", async ({ page }) => {
          const disabledItem = getRandomItem();
          const menuitems = testItems.map((name) => ({ name, disabled: name === disabledItem }));
          await renderDefaultHTMLToPage(page, { menuitems });
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

          // Expand the `menu`
          const menubutton = page.getByRole("button");
          await menubutton.click();
          await expect(menubutton).toBeExpanded();

          // Selecting a disabled `menuitem` DOES NOT dispatch a `menuselect` event
          const menu = page.getByRole("menu");
          const disabledItemElement = menu.getByRole("menuitem", { name: disabledItem, disabled: true });
          const eventPromise = waitForMenuSelect();
          await disabledItemElement.click({ force: true }); // Note: `force` is required because element is `disabled`

          const error = await eventPromise.catch((e: ObservationError) => e);
          expect(error).toBeInstanceOf(ObservationError);
          expect((error as ObservationError).observations).toHaveLength(0);
        });

        it("Throws when a selected `menuitem` is missing a valid Action ID", async ({ page }) => {
          // Render the target `menuitem` with an empty (invalid) Action ID
          const itemName = getRandomItem();
          const menuitems = testItems.map((name) => ({ name, action: name === itemName ? "" : undefined }));
          await renderDefaultHTMLToPage(page, { menuitems });

          // Expand the `menu`
          const menubutton = page.getByRole("button");
          await menubutton.click();
          await expect(menubutton).toBeExpanded();

          // Selecting a `menuitem` having no Action ID throws (and dispatches no `menuselect` event)
          const menu = page.getByRole("menu");
          const itemElement = menu.getByRole("menuitem", { name: itemName });
          const waitForNextError = createErrorWatcher(page);
          const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });

          const errorPromise = waitForNextError();
          const eventPromise = waitForMenuSelect();
          await itemElement.click();

          const errors = await errorPromise;
          expect(errors).toHaveLength(1);
          expect(errors[0]).toBeInstanceOf(Error);
          expect(errors[0].name).toBe(TypeError.name);
          expect(errors[0].message).toBe("A `menuitem` without a populated `data-action` attribute was selected.");

          // The throw happens before dispatch, so no `menuselect` event fires and the `menu` stays open
          await expect(menubutton).toBeExpanded();
          const eventError = await eventPromise.catch((e: ObservationError) => e);
          expect(eventError).toBeInstanceOf(ObservationError);
          expect((eventError as ObservationError).observations).toHaveLength(0);
        });

        it("Bubbles, and is neither cancelable nor composed", async ({ page }) => {
          /* ---------- Setup ---------- */
          const buttonLightId = "button-light";
          const buttonShadowId = "button-shadow";
          const menuLightId = "menu-light";
          const menuShadowId = "menu-shadow";

          await page.goto(url);
          await renderHTMLToPage(page)`
            ${createMenuButton({ id: buttonLightId, controls: menuLightId, children: "Light Button" })}
            <menu-element id="${menuLightId}" menubutton="${buttonLightId}" aria-label="Light Menu">
              ${testItems.map((name) => createMenuItem({ name })).join("")}
            </menu-element>
          `;

          const shadowHTML = `
            <slot></slot>
            <link rel="stylesheet" href="./src/MenuElement/MenuElement.css" />
            <fieldset aria-label="Shadow Group">
              ${createMenuButton({ id: buttonShadowId, controls: menuShadowId, children: "Shadow Button" })}
              <menu-element id="${menuShadowId}" menubutton="${buttonShadowId}" aria-label="Shadow Menu">
                ${testItems.map((name) => createMenuItem({ name })).join("")}
              </menu-element>
            </fieldset>
          ` as const;

          await page.evaluate((html) => (document.body.attachShadow({ mode: "open" }).innerHTML = html), shadowHTML);

          // NOTE: In the Light DOM, we intentionally attach a `document` event listener to test Bubbling and Shadow Piercing
          const timeout = 500;
          const menuLight = page.getByRole("menu", { name: "Light Menu", includeHidden: true });
          const menuShadow = page.getByRole("menu", { name: "Shadow Menu", includeHidden: true });
          const waitForMenuSelectLight = await createDOMEventWaiter(menuLight, "menuselect", {
            timeout,
            document: true,
          });
          const waitForMenuSelectShadow = await createDOMEventWaiter(menuShadow, "menuselect", { timeout });

          expect(await page.evaluate(() => document.body.shadowRoot)).not.toBe(null);
          expect(await page.evaluate(() => document.body.shadowRoot?.constructor.name)).toBe("ShadowRoot");

          /* ---------- Assertions ---------- */
          await it.step("In the Light DOM", async () => {
            // Expand the `menu`
            const menubuttonLight = page.getByRole("button", { name: "Light Button" });
            await menubuttonLight.click();
            await expect(menubuttonLight).toBeExpanded();

            // Attempt to cancel all events in the Light DOM. (Shouldn't work if event isn't cancelable.)
            await menuLight.evaluate((node: MenuElement) => {
              node.addEventListener("menuselect", (e) => e.preventDefault());
            });

            const defaultPrevented = page.evaluate(() => {
              return new Promise<boolean>((resolve) => {
                document.addEventListener("menuselect", (e) => resolve(e.defaultPrevented), { once: true });
              });
            });

            // Select a `menuitem` in the Light DOM and check the results
            const menuitemLight = menuLight.getByRole("menuitem", { name: getRandomItem() });
            const [[eventLight]] = await Promise.all([waitForMenuSelectLight(), menuitemLight.click()]);

            expect(eventLight.bubbles).toBe(true);
            expect(eventLight.cancelable).toBe(false);
            expect(await defaultPrevented).toBe(eventLight.cancelable);
            expect(eventLight.composed).toBe(false);
          });

          await it.step("In the Shadow DOM", async () => {
            // Expand the `menu`
            const menubuttonShadow = page.getByRole("button", { name: "Shadow Button" });
            await menubuttonShadow.click();
            await expect(menubuttonShadow).toBeExpanded();

            // Select a `menuitem` in the Shadow DOM and check the results
            const menuitemShadow = menuShadow.getByRole("menuitem", { name: getRandomItem() });

            const eventsLightPromise = waitForMenuSelectLight();
            const [eventsShadow] = await Promise.all([waitForMenuSelectShadow(), menuitemShadow.click()]);

            // The event was definitely dispatched in the Shadow DOM
            expect(eventsShadow).toHaveLength(1);
            expect(eventsShadow[0].bubbles).toBe(true);
            expect(eventsShadow[0].cancelable).toBe(false);
            expect(eventsShadow[0].composed).toBe(false);

            // But it didn't pierce the Shadow Boundary because it wasn't composed
            const error = await eventsLightPromise.catch((e: ObservationError) => e);
            expect(error).toBeInstanceOf(ObservationError);
            expect((error as ObservationError).observations).toHaveLength(1);
          });
        });
      });
    });

    it.describe("Dynamic `menuitem` Management", () => {
      it("Initializes `menuitem`s present at mount time with the correct `tabindex`", async ({ page }) => {
        const tabindex = "tabindex";
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitems = menu.getByRole("menuitem", { includeHidden: true });

        await it.step("On Initial Mount", async () => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <menu-element>
              ${testItems
                .map((name) => `<div role="menuitem" data-action="${name.toLowerCase()}">${name}</div>`)
                .join("")}
            </menu-element>
          `;

          // Every `menuitem` present at mount is normalized to `tabindex="-1"` (unfocusable until the `menu` opens)
          await expect(menuitems).toHaveCount(testItems.length);
          for (const menuitem of await menuitems.all()) {
            await expect(menuitem).toHaveAttribute(tabindex, String(-1));
            await expect(menuitem).toHaveJSProperty("tabIndex", -1);
          }
        });

        await it.step("On Re-mount", async () => {
          // Corrupt the `tabindex` of every `menuitem` so that re-mounting has something to fix
          for (const menuitem of await menuitems.all()) {
            await menuitem.evaluate((node) => (node.tabIndex = 3));
            await expect(menuitem).toHaveJSProperty("tabIndex", 3);
            await expect(menuitem).toHaveAttribute(tabindex, "3");
          }

          // Detach the `menu` from the DOM, then reconnect it
          await menu.evaluate((node) => {
            const parent = node.parentElement as HTMLElement;
            node.remove();
            parent.append(node);
          });

          // Reconnecting the `menu` re-normalizes every `menuitem` back to `tabindex="-1"`
          await expect(menuitems).toHaveCount(testItems.length);
          for (const menuitem of await menuitems.all()) {
            await expect(menuitem).toHaveAttribute(tabindex, String(-1));
            await expect(menuitem).toHaveJSProperty("tabIndex", -1);
          }
        });
      });

      it("Initializes `menuitem`s added to the `menu` after mounting with the correct `tabindex`", async ({ page }) => {
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitems = menu.getByRole("menuitem", { includeHidden: true });
        await expect(menuitems).toHaveCount(testItems.length);

        // Add a brand-new `menuitem` (WITHOUT a `tabindex`) to the `menu` after it has already mounted
        const newItemName = "Brand New Item";
        await menu.evaluate((node, name) => {
          const item = document.createElement("div");
          item.role = "menuitem";
          item.textContent = name;
          item.dataset.action = "brand-new";
          node.appendChild(item);
        }, newItemName);

        // The `menu` normalizes the newly-added `menuitem` to `tabindex="-1"`
        const newItem = menu.getByRole("menuitem", { name: newItemName, includeHidden: true });
        await expect(menuitems).toHaveCount(testItems.length + 1);
        await expect(newItem).toHaveAttribute("tabindex", String(-1));
        await expect(newItem).toHaveJSProperty("tabIndex", -1);

        // Add another `menuitem`, this time with a pre-existing `tabindex`
        const anotherItemName = "Another Item Name";
        await menu.evaluate((node, name) => {
          const item = document.createElement("div");
          item.role = "menuitem";
          item.tabIndex = 5;
          item.textContent = name;
          item.dataset.action = "another-one";
          node.appendChild(item);
        }, anotherItemName);

        // The `menu` still normalizes the `menuitem` to `tabindex="-1"`
        const anotherItem = menu.getByRole("menuitem", { name: anotherItemName, includeHidden: true });
        await expect(menuitems).toHaveCount(testItems.length + 2);
        await expect(anotherItem).toHaveAttribute("tabindex", String(-1));
        await expect(anotherItem).toHaveJSProperty("tabIndex", -1);
      });

      it("Strips out non-`HTMLElement` child nodes (both at mount time and after)", async ({ page }) => {
        const expectedChildCount = 3;
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitems = menu.getByRole("menuitem", { includeHidden: true });

        await it.step("On Initial Mount", async () => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <menu-element>
              Stray text that should be removed
              ${createMenuItem({ name: testItems[0] })}
              Another stray text node
              ${createMenuItem({ name: testItems[1] })}
              ${createMenuItem({ name: testItems[2] })}
              <svg viewBox="0 0 1 1" width="100px"><circle cx="50%" cy="50%" r="50%" fill="red" /></svg>
            </menu-element>
          `;

          // The `menuitem`s survive, but every non-`HTMLElement` node (text nodes, `SVGElement`s, etc.) is stripped away
          await expect(menuitems).toHaveCount(expectedChildCount);
          expect(await menu.evaluate((node) => node.childNodes.length)).toBe(expectedChildCount);
        });

        await it.step("After Mounting", async () => {
          // Append stray non-`HTMLElement` nodes to the already-mounted `menu`
          await menu.evaluate((node) => {
            node.appendChild(document.createTextNode("Stray text added after mounting"));
            node.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
          });

          // The `menu` strips them out, leaving only `HTMLElement` children behind
          await expect(menuitems).toHaveCount(expectedChildCount);
          expect(await menu.evaluate((node) => node.childNodes.length)).toBe(expectedChildCount);
        });

        await it.step("On Re-mount", async () => {
          // Remove the `menu`, add invalid Nodes, then re-mount the `menu`
          const childrenPreMount = await menu.evaluate((node) => {
            const parent = node.parentElement as HTMLElement;
            node.remove();

            node.appendChild(document.createTextNode("Sneaky stray text node"));
            node.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
            const preMountCount = node.childNodes.length;

            parent.appendChild(node);
            return preMountCount;
          });

          // The invalid children still don't make it into the DOM
          expect(childrenPreMount).toBe(expectedChildCount + 2);
          await expect(menuitems).toHaveCount(expectedChildCount);
          expect(await menu.evaluate((node) => node.childNodes.length)).toBe(expectedChildCount);
        });
      });

      it("Preserves `Comment` nodes and `separator`s (both at mount time and after)", async ({ page }) => {
        const tabindex = "tabindex";
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitems = menu.getByRole("menuitem", { includeHidden: true });
        const separators = menu.getByRole("separator", { includeHidden: true });

        /** A reusable {@link Page.evaluate} callback used to count the number of {@link Comment}s contained by an element */
        function getCommentNodes(node: Node) {
          return Array.prototype.filter.call(node.childNodes, (n: Node) => n.nodeType === Node.COMMENT_NODE).length;
        }

        await it.step("On Initial Mount", async () => {
          await page.goto(url);
          await renderHTMLToPage(page)`
            <menu-element>
              ${createMenuItem({ name: testItems[0] })}
              <!-- This comment should be preserved -->
              <hr />
              ${createMenuItem({ name: testItems[1] })}
            </menu-element>
          `;

          // The `menuitem`s are still normalized, but `Comment`s and `separator`s are left untouched
          await expect(menuitems).toHaveCount(2);
          for (const menuitem of await menuitems.all()) await expect(menuitem).toHaveJSProperty("tabIndex", -1);

          expect(await menu.evaluate(getCommentNodes)).toBe(1);
          await expect(separators).toHaveCount(1);
          await expect(separators).not.toHaveAttribute(tabindex); // `separator`s don't get a roving `tabindex`
        });

        await it.step("After Mounting", async () => {
          // Add a `Comment` and a `separator` to the already-mounted `menu`
          await menuitems.last().evaluate((node) => {
            node.before(document.createComment("A comment added after mounting"));
            node.before(document.createElement("hr"));
          });

          // Neither the new `Comment` nor the new `separator` is stripped away by the `menu`
          expect(await menu.evaluate(getCommentNodes)).toBe(2);
          await expect(separators).toHaveCount(2);
          for (const separator of await separators.all()) await expect(separator).not.toHaveAttribute(tabindex);

          // And the `menuitem` count is completely unaffected
          await expect(menuitems).toHaveCount(2);
        });

        await it.step("On Re-mount", async () => {
          // Remove the `menu`, add `Comment`s and `separator`s, then re-mount the `menu`
          await menu.evaluate((node) => {
            const parent = node.parentElement as HTMLElement;
            node.remove();

            const menuitem = node.querySelector('[role="menuitem"]') as HTMLElement;
            menuitem.after(document.createComment("A comment added before re-mounting"));
            menuitem.after(document.createElement("hr"));

            parent.appendChild(node);
          });

          // Just like before, the `Comment`s and `separator`s are preserved
          expect(await menu.evaluate(getCommentNodes)).toBe(3);
          await expect(separators).toHaveCount(3);
          for (const separator of await separators.all()) await expect(separator).not.toHaveAttribute(tabindex);

          // And the `menuitem` count is completely unaffected
          await expect(menuitems).toHaveCount(2);
        });
      });
    });

    it.describe("Miscellaneous Behaviors", () => {
      it("Focuses the first `menuitem` when the owning `menubutton` is expanded programmatically", async ({ page }) => {
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu");
        const menubutton = page.getByRole("button");
        await expect(menubutton).not.toBeExpanded();

        // Programmatically expanding the `menubutton` opens the `menu` and focuses its first `menuitem`
        await menubutton.evaluate((node) => (node.ariaExpanded = String(true)));
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        // Programmatically collapsing the `menubutton` closes the `menu` again
        await menubutton.evaluate((node) => (node.ariaExpanded = String(false)));
        await expect(menubutton).not.toBeExpanded();
      });

      it("Avoids memory leaks by removing ALL listeners/observers when disconnected from the DOM", async ({ page }) => {
        const itemName = getRandomItem(testItems);
        const itemAction = itemName.toLowerCase() as Lowercase<typeof itemName>;
        await renderDefaultHTMLToPage(page, { menuitems: testItems.map((name) => ({ name })) });

        const menubutton = page.getByRole("button");
        const menu = page.getByRole("menu", { includeHidden: true });
        const menuitem = menu.getByRole("menuitem", { name: itemName });
        await menu.evaluate((node: MenuElement) => (node.openWithArrows = true));

        /* ---------- Everything works while the `menu` is connected ---------- */
        // Real Interactions: Expand the `menubutton` and select a `menuitem`
        const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });
        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);
        await menubutton.click();
        await expect(menubutton).not.toBeExpanded();

        await menubutton.press("ArrowDown");
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);
        await page.keyboard.press("Escape");
        await expect(menubutton).not.toBeExpanded();

        await menubutton.press("ArrowUp");
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems.at(-1) as string);

        const [menuselectEvents] = await Promise.all([waitForMenuSelect(), menuitem.click()]);
        await expect(menubutton).not.toBeExpanded();
        await expect(menubutton).toBeFocused();
        expect(menuselectEvents).toHaveLength(1);

        // Reset `mouse` location so that it won't accidentally hover the wrong `menuitem` on expansion
        await page.mouse.move(0, 0);

        // Programmatic Interactions: Re-open the `menu` via `aria-expanded`
        await menubutton.evaluate((node) => (node.ariaExpanded = String(true)));
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        /* ---------- Disconnecting the `menu` cleans everything up ---------- */
        /**
         * **WARNING**: `errorPromise` is only awaited at the END of this section. Keep this timeout large enough that
         * the error watcher can't reject before then, and large enough to ensure that the "Event Listener Timeout"
         * (defined later in this section) is reasonably sized. DON'T shrink it. Otherwise, you may introduce test flakiness.
         */
        const errorTimeout = 1_000;
        const waitForNextError = createErrorWatcher(page, { timeout: errorTimeout });
        const errorPromise = waitForNextError();

        // Remove the `menu` from the DOM (retaining a handle so it can be reconnected later)
        const menuHandle = await menu.evaluateHandle((node) => (node.parentElement as HTMLElement).removeChild(node));

        // Removal force-collapses the `menubutton` and closes the `menu`
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);

        // Clicking the now-orphaned `menubutton` does nothing (its handlers were removed)
        await menubutton.click();
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);

        // Same for Keyboard Interactions
        await menubutton.press("ArrowDown");
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);

        await menubutton.press("ArrowUp");
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);

        // Programmatically clicking a `menuitem` DOES NOT dispatch a `menuselect` event (the delegated listener was removed)
        const menuselectProgrammaticallyDispatched = await menuHandle.evaluate(
          (node, [action, timeout]) => {
            // Listen for any `menuselect` event
            const { promise, resolve } = Promise.withResolvers();
            node.addEventListener("menuselect", handleMenuselect);

            const timer = setTimeout(() => {
              resolve(false);
              node.removeEventListener("menuselect", handleMenuselect);
            }, timeout);

            function handleMenuselect() {
              resolve(true);
              clearTimeout(timer);
              node.removeEventListener("menuselect", handleMenuselect);
            }

            // Programmatically click a `menuitem`
            const element = node.querySelector(`[role="menuitem"][data-action="${action}"]`) as HTMLElement;
            element.click();
            return promise;
          },
          // NOTE: This local listener timeout is kept within the error-watcher window so that a stray throw is still captured
          [itemAction, errorTimeout / 2] as const,
        );

        expect(menuselectProgrammaticallyDispatched).toBe(false);

        // Programmatically changing `aria-expanded` does nothing (the expansion observer was disconnected)
        await menubutton.evaluate((node) => (node.ariaExpanded = String(true)));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);

        // Reset expanded state for future testing
        await menubutton.evaluate((node) => (node.ariaExpanded = String(false)));

        // No errors were thrown by the Interaction Attempts while the `menu` was disconnected from the DOM
        const error = await errorPromise.catch((e: ObservationError) => e);
        expect(error).toBeInstanceOf(ObservationError);
        expect((error as ObservationError).observations).toHaveLength(0);

        /* ---------- Reconnecting the `menu` does not double-register anything ---------- */
        await menuHandle.evaluate((node) => void document.body.appendChild(node));
        await expect(menu).toBeAttached();

        // Clicking the `menubutton` expands the `menu` (a double-registered click handler would net-collapse it)
        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        await menubutton.click();
        await expect(menubutton).not.toBeExpanded();

        // Same for the Keyboard Interactions: No double-toggling issues
        await menubutton.press("ArrowDown");
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);
        await page.keyboard.press("Escape");
        await expect(menubutton).not.toBeExpanded();

        await menubutton.press("ArrowUp");
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems.at(-1) as string);

        // Selecting a `menuitem` dispatches `menuselect` EXACTLY once
        await Promise.all([waitForMenuSelect(), menuitem.click()]);
        await expect(menubutton).not.toBeExpanded();
        await expect(menubutton).toBeFocused();
        expect(menuselectEvents).toHaveLength(2);

        // NOTE: `MutationObserver`s do not x2-observe elements, so that DOES NOT need to be tested
      });

      it("Does not register the `menubutton`'s event listeners if not connected to the DOM", async ({ page }) => {
        await page.goto(url);

        // Build an associated `menubutton`/`menu` pair entirely inside a `DocumentFragment` (i.e., OUTSIDE the DOM)
        const refs = await page.evaluateHandle((itemNames) => {
          document.body.replaceChildren();
          const fragment = document.createDocumentFragment();
          const menuId = "menu" satisfies typeof defaultMenuId;
          const buttonId = "menubutton" satisfies typeof defaultMenuButtonId;
          const buttonName = "Menu" satisfies typeof defaultMenuButtonName;

          // `menubutton`
          const button = document.createElement("button");
          button.id = buttonId;
          button.type = "button";
          button.ariaExpanded = String(false);
          button.setAttribute("aria-controls", menuId);
          button.setAttribute("aria-haspopup", "menu");
          button.textContent = buttonName;

          // `menu`
          const menu = document.createElement("menu-element");
          menu.id = menuId;
          for (const name of itemNames) {
            const menuitem = document.createElement("div");
            menuitem.role = "menuitem";
            menuitem.dataset.action = name.toLowerCase();
            menuitem.textContent = name;
            menu.appendChild(menuitem);
          }

          // Associate the two AFTER both are in the `fragment`
          fragment.append(button, menu);
          menu.setAttribute("menubutton", buttonId);

          return { button, menu };
        }, testItems);

        const menuHandle = (await refs.getProperty("menu")) as JSHandle<MenuElement>;
        const buttonHandle = (await refs.getProperty("button")) as JSHandle<HTMLButtonElement>;

        /* ---------- The association exists, but no handlers are registered ---------- */
        // `menuButtonElement` resolves correctly (the association is by `id` within the `fragment`)
        expect(await refs.evaluate((r) => r.menu.menuButtonElement === r.button)).toBe(true);

        // Programmatically clicking the `menubutton` does nothing (it has no registered handlers)
        await buttonHandle.evaluate((node) => node.click());
        expect(await buttonHandle.evaluate((node) => node.ariaExpanded)).toBe(String(false));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);

        // Turning on `openwitharrows` also does nothing because the `menu` is still disconnected from the DOM
        await menuHandle.evaluate((node) => void (node.openWithArrows = true));
        expect(await menuHandle.evaluate((node) => node.hasAttribute("openwitharrows"))).toBe(true);

        /* ---------- Connecting ONLY the `menubutton` still leaves it unusable ---------- */
        await buttonHandle.evaluate((node) => void document.body.appendChild(node));
        expect(await menuHandle.evaluate((node) => node.isConnected)).toBe(false);

        // A real click does nothing
        const menubutton = page.getByRole("button");
        await menubutton.click();
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));

        // Real ArrowDown/ArrowUp presses do nothing either (even though `openwitharrows` is on)
        await menubutton.press("ArrowDown");
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));

        await menubutton.press("ArrowUp");
        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));

        // The `menu` never opened, and it's still the associated (but unregistered) `menubutton`
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);
        expect(await refs.evaluate((r) => r.menu.menuButtonElement === r.button)).toBe(true);
      });

      it("Does not attempt to register a `menubutton` on mount if none exists", async ({ page }) => {
        // NOTE: Here, it's sufficient to verify that no errors are thrown on-connect
        await page.goto(url);
        const waitForNextError = createErrorWatcher(page, { timeout: 500 });
        const errorPromise = waitForNextError();

        // Mounting a `menu` that has NO associated `menubutton` produces no errors
        await renderHTMLToPage(page)`
          <menu-element id="${defaultMenuId}">
            ${testItems.map((name) => createMenuItem({ name })).join("")}
          </menu-element>
        `;

        const menu = page.getByRole("menu", { includeHidden: true });
        await expect(menu).toHaveJSProperty("menuButtonElement", null);
        await expect(menu.getByRole("menuitem", { includeHidden: true })).toHaveCount(testItems.length);

        // No errors were thrown while (or after) mounting
        const error = await errorPromise.catch((e: ObservationError) => e);
        expect(error).toBeInstanceOf(ObservationError);
        expect((error as ObservationError).observations).toHaveLength(0);
      });

      it("Does not attempt to unregister a `menubutton` that doesn't exist on unmount", async ({ page }) => {
        // NOTE: Here, it's sufficient to verify that no errors are thrown on-disconnect
        await renderDefaultHTMLToPage(page);
        const menu = page.getByRole("menu", { includeHidden: true });

        // Dissociate the `menu` from its `menubutton`
        await menu.evaluate((node) => node.removeAttribute("menubutton"));
        await expect(menu).toHaveJSProperty("menuButtonElement", null);

        // Disconnecting the now-buttonless `menu` from the DOM throws nothing
        const waitForNextError = createErrorWatcher(page, { timeout: 500 });
        const errorPromise = waitForNextError();

        await menu.evaluate((node) => node.remove());
        await expect(menu).not.toBeAttached();

        const error = await errorPromise.catch((e: ObservationError) => e);
        expect(error).toBeInstanceOf(ObservationError);
        expect((error as ObservationError).observations).toHaveLength(0);
      });

      it("Does not redundantly register event listeners", async ({ page }) => {
        await renderDefaultHTMLToPage(page);
        const menubutton = page.getByRole("button");
        const menu = page.getByRole("menu", { includeHidden: true });

        // The handlers work correctly out of the box
        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        await menubutton.click();
        await expect(menubutton).not.toBeExpanded();

        // Manually re-run the "On Mount" lifecycle to attempt a redundant registration
        await menu.evaluate((node: MenuElement) => node.connectedCallback());

        // Clicking the `menubutton` STILL toggles the `menu` singularly (a doubled click handler would net-collapse it)
        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        // And selecting a `menuitem` dispatches the `menuselect` event EXACTLY once
        const menuitem = menu.getByRole("menuitem", { name: getRandomItem() });
        const waitForMenuSelect = await createDOMEventWaiter(page, "menuselect", { timeout: 500 });
        const [events] = await Promise.all([waitForMenuSelect(), menuitem.click()]);

        await expect(menubutton).not.toBeExpanded();
        await expect(menubutton).toBeFocused();
        expect(events).toHaveLength(1);
      });

      it("Automatically closes when removed from the DOM", async ({ page }) => {
        const anchorId = "anchor";
        await page.goto(url);
        await renderHTMLToPage(page)`
          ${createMenuButton()}
          <menu-element id="${defaultMenuId}" menubutton="${defaultMenuButtonId}">
            ${testItems.map((name) => createMenuItem({ name })).join("")}
          </menu-element>
          <div id="${anchorId}"></div>
        `;

        const menubutton = page.getByRole("button");
        const anchor = page.locator(`[id="${anchorId}"]`);
        const menu = page.getByRole("menu", { includeHidden: true });

        // Expand the `menu`
        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        // (Re-)anchoring relocates the `menu` (causing a remove -> reconnect), which force-collapses it
        await menu.evaluate((node, id) => node.setAttribute("menuanchor", id), anchorId);
        await expect(menu.and(anchor.locator(":scope > :last-child"))).toBeAttached();
        await expect(menubutton).not.toBeExpanded();

        // Move the `menu` back to the `<body>` and expand it again to prove it still works
        await menu.evaluate((node) => {
          node.removeAttribute("menuanchor");
          document.body.appendChild(node);
        });

        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        // Removing the `menu` from the DOM entirely also force-collapses the `menubutton`
        const menuHandle = await menu.evaluateHandle((node) => (node.parentElement as HTMLElement).removeChild(node));
        await expect(menu).not.toBeAttached();

        await expect(menubutton).toHaveAttribute(attrs["aria-expanded"], String(false));
        expect(await menuHandle.evaluate((node, attr) => node.hasAttribute(attr), attrs["data-open"])).toBe(false);
      });

      // NOTE: This is basically a must have if we want to support popular JavaScript Frameworks like React
      it("Supports initializing all attributes BEFORE mounting to the DOM", async ({ page }) => {
        /* ---------- Setup ---------- */
        await page.goto(url);
        const containerId = "container";
        const waitForNextError = createErrorWatcher(page, { timeout: 500 });
        const errorPromise = waitForNextError();

        // Build a complete `menubutton`/`menu` pair OUTSIDE a `DocumentFragment` and OUTSIDE the DOM
        await page.evaluate((itemNames) => {
          const menuId = "menu" satisfies typeof defaultMenuId;
          const buttonId = "menubutton" satisfies typeof defaultMenuButtonId;
          const buttonName = "Menu" satisfies typeof defaultMenuButtonName;

          // Container
          const container = document.createElement("div");
          container.id = "container" satisfies typeof containerId;

          // `menubutton`
          const button = container.appendChild(document.createElement("button"));
          button.id = buttonId;
          button.type = "button";
          button.ariaExpanded = String(false);
          button.setAttribute("aria-controls", menuId);
          button.setAttribute("aria-haspopup", "menu");
          button.textContent = buttonName;

          // `menu` | NOTE: We must add ALL attributes here so we can verify that no errors will ever be thrown pre-mount
          const menu = document.createElement("menu-element");
          menu.id = menuId;
          menu.setAttribute("menubutton", buttonId);
          menu.setAttribute("menuanchor", "container" satisfies typeof containerId);
          menu.openWithArrows = true;

          // `menuitems`
          for (const name of itemNames) {
            const menuitem = document.createElement("div");
            menuitem.role = "menuitem";
            menuitem.dataset.action = name.toLowerCase();
            menuitem.textContent = name;
            menu.appendChild(menuitem);
          }

          // Mount children to the DOM. Ensure `menu` is placed somewhere that will allow `menuanchor` to execute properly.
          if (container.contains(menu)) throw new TypeError("Test DOM Nodes were prepared incorrectly");
          document.body.replaceChildren(container, menu);
        }, testItems);

        const menu = page.getByRole("menu");
        const menubutton = page.getByRole("button");
        const anchor = page.locator(`[id="${containerId}"]`);

        /* ---------- Assertions ---------- */
        // The `menubutton` was successfully associated on mount
        await menubutton.click();
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);

        await menubutton.click();
        await expect(menubutton).not.toBeExpanded();

        // That includes proper Keyboard Interaction setup too
        await menubutton.press("ArrowDown");
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems[0]);
        await page.keyboard.press("Escape");
        await expect(menubutton).not.toBeExpanded();

        await menubutton.press("ArrowUp");
        await expect(menubutton).toBeExpanded();
        await expect(menu).toHaveActiveItem(testItems.at(-1) as string);

        // Anchoring was successful as well
        await expect(menu.and(anchor.locator(":scope > :last-child"))).toBeVisible();

        // And no errors were thrown the entire time from start to end
        const error = await errorPromise.catch((e: ObservationError) => e);
        expect(error).toBeInstanceOf(ObservationError);
        expect((error as ObservationError).observations).toHaveLength(0);
      });
    });
  });
});
