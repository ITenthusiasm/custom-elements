import { test as it, expect as baseExpect } from "@playwright/test";
import type { Page, Locator, MatcherReturnType } from "@playwright/test";
import { renderHTMLTo, insertAdjacentHTML } from "../../__test-utils__/rendering.js";
import { createDOMEventWaiter, createErrorWatcher, ObservationError } from "../../__test-utils__/watchers.js";
import type PseudoBackdrop from "../PseudoBackdrop.js";
import type { CSSInfinity } from "../PseudoBackdrop.js";

/*
 * General Testing Guidelines:
 * - When testing animation phases, always prefer testing **_at least_** 2 properties being animated at the same time,
 *   with different animation durations. Unless otherwise specified, ALWAYS test 2 properties for animations!
 * - When possible, you should always test both `[animates="both"]` and `[animates="none"]` unless it **_clearly_**
 *   doesn't make sense (e.g., you're testing a `role` check, which has nothing to do with animations at all).
 * - ALWAYS test BOTH the "Popover" and its "Elevated Sibling" in ALL tests to verify that BOTH work correctly in all
 *   circumstances. You should only omit the Elevated Sibling when _necessary_ for testing purposes. (e.g., you're
 *   writing a test which explicitly proves that the component works fine without a specified "Elevated Sibling".)
 * - We intentionally DO NOT test `[animates="forwards"]` or `[animates="backwards"]` in these tests. If `both`
 *   and `none` work fine, then that implies that `forwards` and `backwards` _must_ have the ability to function
 *   well. (If they don't in our code, it's almost certainly a minor conditional assertion slip-up. That's an easy fix
 *   that isn't worth bloating up our test code to capture/prevent.)
 * - Because this is an Internal Component, we are intentionally NOT testing integrations with `ShadowRoot`s
 *   (for simplicity's sake). With `getRootNode()`, things should work as is. Support should only break if we stop
 *   calling `getRootNode()`, or call it at the wrong time. Both problems should be simple enough to debug and fix.
 * - WARNING: In these tests, you need to be mindful of when setting `{ timeout: 0 }` in the Playwright Assertion
 *   Options is NECESSARY. For example, when opening a `<pseudo-backdrop>`, the `z-index`es of the appropriate elements
 *   should be elevated IMMEDIATELY -- NOT "within 5000ms". Other times, allowing Playwright Assertions to maintain their
 *   default timeout MIGHT be acceptable. For example, when closing a `<pseudo-backdrop>`, we just want to know that the
 *   `z-index` wasn't prematurely removed. For that, the `timeout` option argument doesn't matter, because if the
 *   `z-index` _was_ prematurely removed, then the assertion would never pass no matter how long we waited.
 * - WARNING: Waiting for multiple `create*{Waiter,Watcher}` functions to finish with the same `timeout` may result in
 *   Playwright complaining about unhandled `Promise` rejections. When setting up multiple watchers which you expect
 *   to timeout, try giving them different timeout values. That way, the `Promise`s will reject at different times
 *   and thus can be handled/caught independently.
 *   - NOTE: You might be able to circumvent this concern by writing a Custom Playwright Fixture which automatically
 *     tracks the errors in EVERY test and verifies that no errors were thrown at the end of ANY given test. See the
 *     `pseudo-backdrop-tests-review-1` Claude Code chat for ideas, though you should be able to design this on your own.
 *     If you implement this idea, then only event watchers will be able to timeout in any given test. However, this
 *     will still be an issue if you setup multiple _event_ listeners at the same time, all of which you _expect_ to timeout.
 * - WARNING: Some tests MIGHT be flaky. This is not avoidable because the tests surrounding the `PseudoBackdrop` component
 *   _primarily_ deal with animation times. If you see a failure, certainly investigate it and make sure there isn't a bug
 *   in our code. (Real bugs _should_ consistently fail, not flake.) But unfortunately, _some_ amount of **_MINOR_** and
 *   **_RARE_** flakiness is to be expected (mainly in non-Chrome browsers) because of the nature of time-dependent tests.
 * - NOTE: The following may be helpful for understanding our usage of the Chrome Devtools Protocol (CDP) in these tests:
 *   - https://playwright.dev/docs/api/class-cdpsession
 *   - https://chromedevtools.github.io/devtools-protocol/#/Runtime.evaluate
 *   - https://chromedevtools.github.io/devtools-protocol/#/Runtime.RemoteObject
 *   - https://chromedevtools.github.io/devtools-protocol/#/Runtime.releaseObjectGroup
 * - NOTE: If you decide that you **_really_** want to cover all your bases beyond all the critical-to-ship paths, you can
 *   visit the following Claude Code conversations for ideas on other things to test. Again, these are not necessarily
 *   essential, but they _can_ be useful for increasing coverage if you have the time _and_ the concern:
 *   - `pseudo-backdrop-tests-review-1`
 *   - `pseudo-backdrop-tests-review-2`
 */

/* ---------------------------------------- Constants ---------------------------------------- */
/** The {@link Element.tagName} of the {@link PseudoBackdrop} */
const tagName = "pseudo-backdrop";
const popoverSelector = "[popover]";
const popoverOpenSelector = ":popover-open";

/** The `integer` which `calc(infinity)` translates to in CSS */
const infinityInteger = 2147483647;
const url = "http://localhost:5173";

/** The configurations of {@link PseudoBackdrop.animates} that must be tested in this file. */
const animatesOptions = Object.freeze(["both", "none"] as const satisfies PseudoBackdrop["animates"][]);

/** The attributes _commonly_ used for **testing** the {@link PseudoBackdrop}. (Declared to help avoid typos.) */
const attrs = Object.freeze({
  /** Identifies an element's owning {@link PseudoBackdrop} by ID */
  "data-backdrop": "data-backdrop",

  /** For a DOM Node with an owning {@link PseudoBackdrop}, identifies the element it wants to elevate alongside itself */
  "data-elevates": "data-elevates",

  /** The HTML Attribute used to toggle the visibility of a {@link PseudoBackdrop} (typically via CSS) */
  "data-open": "data-open",
});

/* ---------------------------------------- DOM Rendering Helpers ---------------------------------------- */
const defaultDurations = Object.freeze({ long: 500, short: 250 } as const satisfies RenderOptions["durations"]);
interface RenderOptions {
  /**
   * The {@link PseudoBackdrop.animates} attribute value, restricted to `"both"` and `"none"`. Defaults to `"both"`.
   *
   * When `"none"`, `transition-property` will be set to `none` for the {@link PseudoBackdrop}. Otherwise, the
   * `transition-property` will be set to all animatable properties used in these tests.
   * @see {@link createPseudoBackdropStyles}
   */
  animates?: (typeof animatesOptions)[number];
  /**
   * Specifies the durations of the various animations ({@link CSSTransition CSSTransitions})
   * used for the {@link PseudoBackdrop} in these tests (in milliseconds).
   */
  durations?: {
    /**
     * The duration of the longest-running CSS Transition for the {@link PseudoBackdrop} (in milliseconds).
     * Defaults to {@link defaultDurations.long}.
     */
    long?: number;
    /**
     * The duration of the shortest CSS Transition for the {@link PseudoBackdrop} (in milliseconds).
     * Defaults to {@link defaultDurations.short}.
     */
    short?: number;
  };
}

/**
 * Renders the default HTML used to test the {@link PseudoBackdrop} to the provided `page`.
 *
 * For convenience, this function also calls {@link Page.goto} with the default test {@link url} before rendering the HTML.
 */
async function renderDefaultHTMLToPage(page: Page, options?: RenderOptions) {
  const animates = options?.animates ?? "both";
  const backdropId = "backdrop";
  const popoverId = "popover";
  const siblingId = "sibling";

  await page.goto(url);
  await renderHTMLTo(page)`
    ${createPseudoBackdropStyles({ ...options, animates })}
    <button id="${siblingId}" type="button" popovertarget="${popoverId}">Toggle Popover</button>
    <div id="${popoverId}" popover ${attrs["data-backdrop"]}="${backdropId}" ${attrs["data-elevates"]}="${siblingId}">
      Popover
    </div>
    <${tagName} id="${backdropId}" animates="${animates}"></${tagName}>
  `;
}

/**
 * Produces an {@link HTMLStyleElement} (as a DOM String) which is used to apply all the styles that are needed to test
 * the {@link PseudoBackdrop} element accurately.
 */
function createPseudoBackdropStyles(options?: RenderOptions): string {
  const durationLong = options?.durations?.long ?? defaultDurations.long;
  const durationShort = options?.durations?.short ?? defaultDurations.short;
  if (durationShort > durationLong) throw new RangeError("`durations.short` cannot be greater than `durations.long`");

  return `
    <style>
      ${tagName} {
        position: fixed;
        inset: 0;
        z-index: ${infinityInteger - 1};

        visibility: hidden;
        opacity: 0;
        background-color: rgb(0 0 0 / 0);

        transition-property: ${options?.animates === "none" ? "none" : "visibility, background-color, opacity"};
        transition-behavior: allow-discrete;
        transition-duration: ${durationLong}ms, ${durationLong}ms, ${durationShort}ms;
        transition-timing-function: linear;

        &[data-open] {
          visibility: visible;
          opacity: 1;
          background-color: rgb(0 0 0 / 0.5);
        }
      }
    </style>
  `;
}

/* ---------------------------------------- Custom Assertions ---------------------------------------- */
const expect = baseExpect.extend({
  /** Asserts that the provided element was elevated to a high z-index by the {@link PseudoBackdrop} */
  async toHaveElevatedZIndex(element: Locator, options?: { timeout?: number }) {
    const name = "toHaveElevatedZIndex";
    const timeout = options?.timeout ?? this.timeout;

    try {
      const infinity: CSSInfinity = "calc(infinity)";
      await baseExpect(element).toHaveCSS("z-index", this.isNot ? "auto" : String(infinityInteger), { timeout });
      await baseExpect(element).toHaveJSProperty("style.zIndex", this.isNot ? "" : infinity, { timeout });

      // Error Messaging is handled by `catch` block, so an empty string is fine here.
      return { name, pass: !this.isNot, message: () => "" };
    } catch (error) {
      const { matcherResult } = error as { matcherResult: MatcherReturnType };
      return { ...matcherResult, name, pass: this.isNot, message: () => String(matcherResult.message) };
    }
  },
  /**
   * Asserts that the provided `backdrop` (which should point to an instance of {@link PseudoBackdrop})
   * has the correct styles based on its open/closed `state`.
   *
   * @param backdrop
   * @param state The open/closed state of the backdrop.
   * - `open`: The backdrop is open and is not in the middle of an animation. Asserts that the styles reflect this.
   * - `closed`: The backdrop is closed and is not in the middle of an animation. Asserts that the styles reflect this.
   * - `in-transition`: The backdrop is animating from an opened state to a closed state (or vice versa). Styles will
   *   be asserted to be somewhere in between the expected `open` styles and the expected `closed` styles.
   *
   * @param options
   */
  async toHaveBackdropStateStyles(
    backdrop: Locator,
    state: "open" | "closed" | "in-transition",
    options?: { timeout?: number },
  ) {
    const name = "toHaveBackdropStateStyles";
    const timeout = options?.timeout ?? this.timeout;

    try {
      await expect(backdrop.and(backdrop.page().locator(tagName))).toBeAttached();

      if (state === "closed") {
        await expect(backdrop).toHaveCSS("opacity", "0", { timeout });
        await expect(backdrop).toHaveCSS("background-color", "rgba(0, 0, 0, 0)", { timeout });
        expect(await backdrop.evaluate((node) => node.getAnimations().length)).toBe(0);
      } else if (state === "open") {
        await expect(backdrop).toHaveCSS("opacity", "1", { timeout });
        await expect(backdrop).toHaveCSS("background-color", "rgba(0, 0, 0, 0.5)", { timeout });
        expect(await backdrop.evaluate((node) => node.getAnimations().length)).toBe(0);
      } else {
        await expect(backdrop).not.toHaveCSS("opacity", "0", { timeout });
        await expect(backdrop).not.toHaveCSS("opacity", "1", { timeout });
        await expect(backdrop).toHaveCSS("opacity", /^0\.\d+$/, { timeout });

        await expect(backdrop).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)", { timeout });
        await expect(backdrop).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0.5)", { timeout });
        await expect(backdrop).toHaveCSS("background-color", /^rgba\(0, 0, 0, 0\.[0-4]\d*\)$/, { timeout });
        expect(await backdrop.evaluate((node) => node.getAnimations().length)).toBeGreaterThanOrEqual(2);
      }

      // Error Messaging is handled by `catch` block, so an empty string is fine here.
      return { name, pass: !this.isNot, message: () => "" };
    } catch (error) {
      const { matcherResult } = error as { matcherResult: MatcherReturnType };
      return { ...matcherResult, name, pass: this.isNot, message: () => String(matcherResult.message) };
    }
  },
});

/* ---------------------------------------- Tests ---------------------------------------- */
it.describe("Pseudo Backdrop Web Component (Internal)", () => {
  it("Has no accessible `role`", async ({ page }) => {
    await renderDefaultHTMLToPage(page);
    await expect(page.locator(tagName)).toHaveRole("none");
  });

  // NOTE: We only need to test `Document` event listener removal here, since the `transition*` events are "auto-removed"
  it("Removes its event listeners when removed from the DOM", async ({ page, browserName }) => {
    // NOTE: Since listener (un)registration behaves identically in every browser, testing Chromium alone is sufficient.
    it.skip(
      browserName !== "chromium",
      "Inspecting a `Document`'s event listeners requires the Chrome DevTools Protocol (CDP)",
    );

    /* ---------- Setup ---------- */
    await page.goto(url);
    await page.evaluate(() => document.body.replaceChildren());
    const CDP = await page.context().newCDPSession(page);

    /** Returns the number of `capture`-ing `toggle` event listeners currently registered on the page's `Document` */
    async function getToggleListenerCount(): Promise<number> {
      // NOTE: The `Document`'s Remote Object is resolved on every function call (instead of only once) because
      // its `objectId` is tied to the page's current JS Execution Context, which can be replaced (e.g., by a page reload).
      const objectGroup = "toggle-listener-count";
      const { result } = await CDP.send("Runtime.evaluate", { expression: "document", objectGroup });
      const { listeners } = await CDP.send("DOMDebugger.getEventListeners", { objectId: result.objectId as string });
      await CDP.send("Runtime.releaseObjectGroup", { objectGroup });

      return listeners.filter((listener) => listener.type === "toggle" && listener.useCapture).length;
    }

    // NOTE: Other scripts (e.g., other Custom Elements) could register `toggle` listeners too. So we track a baseline.
    const baselineCount = await getToggleListenerCount();

    /* ---------- Assertions ---------- */
    // Mounting registers exactly 1 listener per backdrop
    await renderHTMLTo(page)`
      <${tagName} id="backdrop-a"></${tagName}>
      <${tagName} id="backdrop-b"></${tagName}>
    `;

    const backdropA = page.locator("#backdrop-a");
    const backdropB = page.locator("#backdrop-b");
    await expect(backdropA).toBeAttached();
    await expect(backdropB).toBeAttached();
    expect(await getToggleListenerCount()).toBe(baselineCount + 2);

    // Removing a backdrop removes ONLY its own listener
    const backdropAHandle = await backdropA.elementHandle();
    await backdropAHandle.evaluate((node) => node.remove());
    await expect(backdropA).not.toBeAttached();
    expect(await getToggleListenerCount()).toBe(baselineCount + 1);

    await backdropB.evaluate((node) => node.remove());
    await expect(backdropB).not.toBeAttached();
    expect(await getToggleListenerCount()).toBe(baselineCount);

    // Reconnecting a backdrop re-registers its listener, and removing it again cleans up the listener again
    await backdropAHandle.evaluate((node) => document.body.append(node));
    await expect(backdropA).toBeAttached();
    expect(await getToggleListenerCount()).toBe(baselineCount + 1);

    await backdropAHandle.evaluate((node) => node.remove());
    await expect(backdropA).not.toBeAttached();
    expect(await getToggleListenerCount()).toBe(baselineCount);
  });

  for (const animates of animatesOptions) {
    it.describe(`${animates} Path`, () => {
      it("Does nothing when its owning element is toggled to the state which it already has", async ({ page }) => {
        // Setup
        await renderDefaultHTMLToPage(page, { animates });
        const popover = page.locator(popoverSelector);
        const waitForNextError = createErrorWatcher(page, { timeout: 600 });
        const waitForTransitionrun = await createDOMEventWaiter(page, "transitionrun", { timeout: 500 });
        const waitForToggle = await createDOMEventWaiter(popover, "toggle", { capture: true, document: true });

        // Trigger a `toggle` event that doesn't include a state change
        const pageErrorPromise = waitForNextError();
        const transitionrunPromise = waitForTransitionrun();
        const [toggleEvents] = await Promise.all([
          waitForToggle(),
          popover.evaluate((node: HTMLElement) => {
            node.showPopover();
            node.hidePopover();
          }),
        ]);

        expect(toggleEvents).toHaveLength(1);
        expect(toggleEvents[0].oldState).toBe("closed");
        expect(toggleEvents[0].oldState).toBe(toggleEvents[0].newState);

        // Verify neither `popover` nor backdrop was opened
        await expect(page.locator(popoverSelector)).toBeAttached();
        await expect(page.locator(popoverSelector).and(page.locator(popoverOpenSelector))).not.toBeAttached();

        const backdrop = page.locator(tagName);
        await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);

        const noEventsError = await transitionrunPromise.catch((e: ObservationError) => e);
        expect(noEventsError).toBeInstanceOf(ObservationError);
        expect((noEventsError as ObservationError).observations).toHaveLength(0);

        // Verify that no errors were caused by this interaction
        const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
        expect(noErrorsError).toBeInstanceOf(ObservationError);
        expect((noErrorsError as ObservationError).observations).toHaveLength(0);
      });

      it("Ignores `toggle` events from irrelevant elements", async ({ page }) => {
        // Setup
        const backdrop2Id = "backdrop-b";
        await renderDefaultHTMLToPage(page, { animates });
        await insertAdjacentHTML("beforeend", page)`
          <${tagName} id="${backdrop2Id}" animates="${animates}"></${tagName}>
        `;

        const firstBackdrop = page.locator(tagName).first();
        const secondBackdrop = page.locator(tagName).last();
        const waitForNextError = createErrorWatcher(page, { timeout: 600 });
        const waitForTransitionrun = await createDOMEventWaiter(firstBackdrop, "transitionrun", { timeout: 500 });

        // Verify `popover` has valid setup
        const popover = page.locator(popoverSelector);
        await expect(popover).toHaveAttribute(attrs["data-backdrop"]);
        await expect(popover).toHaveAttribute(attrs["data-elevates"]);

        // NOTE: `backdrop2Id` must be placed last so that we don't have to wait for any CSS Transitions
        for (const backdropAttr of [null, String(Math.random()), backdrop2Id]) {
          let step: string;
          if (backdropAttr == null) step = "Without a `data-backdrop`";
          else if (backdropAttr === backdrop2Id) step = "With an irrelevant `data-backdrop`";
          else step = "With a `data-backdrop` that points nowhere";

          await it.step(step, async () => {
            // Configure `popover`'s `data-backdrop`
            await popover.evaluate((n: HTMLElement) => n.hidePopover());
            await expect(page.locator(popoverSelector).and(page.locator(popoverOpenSelector))).not.toBeAttached();

            if (backdropAttr == null) await popover.evaluate((n, a) => n.removeAttribute(a), attrs["data-backdrop"]);
            else await popover.evaluate((n, [a, v]) => n.setAttribute(a, v), [attrs["data-backdrop"], backdropAttr]);

            // Open the `popover`
            const pageErrorPromise = waitForNextError();
            const transitionrunPromise = waitForTransitionrun();

            const button = page.getByRole("button");
            await button.click();
            await expect(page.locator(popoverSelector).and(page.locator(popoverOpenSelector))).toBeAttached();

            // Verify Backdrop States. (The 1st Backdrop's state should never change.)
            if (backdropAttr === backdrop2Id) {
              await expect(firstBackdrop).not.toHaveAttribute(attrs["data-open"]);
              await expect(secondBackdrop).toHaveAttribute(attrs["data-open"], "");
              await expect(popover).toHaveElevatedZIndex();
              await expect(button).toHaveElevatedZIndex();
            } else {
              await expect(firstBackdrop).not.toHaveAttribute(attrs["data-open"]);
              await expect(secondBackdrop).not.toHaveAttribute(attrs["data-open"]);
              await expect(popover).not.toHaveElevatedZIndex();
              await expect(button).not.toHaveElevatedZIndex();
            }

            const noEventsError = await transitionrunPromise.catch((e: ObservationError) => e);
            expect(noEventsError).toBeInstanceOf(ObservationError);
            expect((noEventsError as ObservationError).observations).toHaveLength(0);

            // Verify that no errors were caused by this interaction
            const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
            expect(noErrorsError).toBeInstanceOf(ObservationError);
            expect((noErrorsError as ObservationError).observations).toHaveLength(0);
          });
        }
      });

      it("Promotes the Toggleable Element and its Elevated Sibling to a higher Stacking Context when opened", async ({
        page,
      }) => {
        // Setup
        await renderDefaultHTMLToPage(page, { animates });
        const button = page.getByRole("button");
        const popover = page.locator(popoverSelector);
        const backdrop = page.locator(tagName);

        // Open `popover` and verify `popover`/backdrop states
        await button.click();
        await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
        await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
        await expect(button).toHaveElevatedZIndex({ timeout: 0 });

        // Verify backdrop styles, accounting for any animations
        if (animates === "both") {
          await page.waitForTimeout(defaultDurations.short / 2);
          await expect(backdrop).toHaveBackdropStateStyles("in-transition");
        }

        await expect(backdrop).toHaveBackdropStateStyles("open");
      });

      if (animates === "both") {
        it.skip("Skips promotions for animated backdrops if no animation has actually run", async () => {
          /*
           * EDIT: THIS TEST IS NOT IMPLEMENTABLE! It seems that this behavior is only observable in REAL
           *       Chrome and Firefox browsers. (Behavior was confirmed in Chrome 151 and Firefox 155 on MacOS.)
           *       On Playwright's Test Browsers for Chrome and Firefox, the scenario is not reproducible.
           *       You'll have to use the information below to test this behavior manually.
           *
           * Need to Implement. `[animates="both"]` path only
           *
           * Basically, you need to toggle an animation on and off at near-instantaneous speed.
           * Probably do this programmatically to avoid any inconsistencies that Playwright's `async/await` may introduce
           * Example:
           * ```js
           * function runTest(button, delay = 0) {
           *   setTimeout(() => {
           *     button.click();
           *     setTimeout(() => button.click(), delay);
           *   }, delay);
           * }
           *
           * runTest(document.querySelector("#my-button"), 3);
           * ```
           *
           * Note that this only seems to work in Chrome/Firefox, which will fire:
           * - `transitionrun` -> `transitionstart` (non-empty animations)
           * - `transitioncancel` -> (empty animations)
           * - `transitionrun` -> `transitionstart` -> `transitionend` (all empty animations)
           *
           * Whereas Safari will stop at:
           * - `transitionrun` -> `transitionstart` (non-empty animations)
           * - `transitioncancel` (empty animations)
           *
           * So we need to skip this test in Safari land
           * ... You MIGHT need to use `waitForEvent` for this... (risky, but might be doable reliably...)
           *
           * Ultimately in the end, you will need to verify that promotion was truly skipped. This means
           * that no `z-index`s should be applied to `pseudoPopover` or `elevatedSibling`, and the backdrop's
           * `data-open` and its styling should be correct.
           */
        });
      }

      // NOTE: This test requires more aggressive checks on animation states during the closing animation
      it("Demotes the Toggleable Element and its Elevated Sibling from their Stacking Contexts when closed", async ({
        page,
      }) => {
        // Setup
        await renderDefaultHTMLToPage(page, { animates });
        const button = page.getByRole("button");
        const popover = page.locator(popoverSelector);
        const backdrop = page.locator(tagName);

        // Open `popover` and verify `popover`/backdrop states, waiting for any forwards animations if needed
        await button.click();
        await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
        await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
        await expect(button).toHaveElevatedZIndex({ timeout: 0 });
        await expect(backdrop).toHaveBackdropStateStyles("open");

        // Now close `popover` and verify backdrop state
        await page.keyboard.press("Escape");
        await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);

        // Verify `popover` and backdrop styles/states, accounting for any animations
        if (animates === "both") {
          const waitForTransitionend = await createDOMEventWaiter(backdrop, "transitionend");
          const transitionendPromise = waitForTransitionend();

          // Wait halfway through the shortest animation and verify states
          await page.waitForTimeout(defaultDurations.short / 2);
          expect(await backdrop.evaluate((node) => node.getAnimations().length)).toBe(3);
          await expect(backdrop).toHaveBackdropStateStyles("in-transition");
          await expect(popover).toHaveElevatedZIndex();
          await expect(button).toHaveElevatedZIndex();

          // Wait for the shortest animation to end and verify states. (Later animations should still be active.)
          const [event] = await transitionendPromise;
          expect(event.propertyName).toBe("opacity");
          await expect(backdrop).toHaveCSS("opacity", "0", { timeout: 0 });
          await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
          await expect(button).toHaveElevatedZIndex({ timeout: 0 });

          await expect(backdrop).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)", { timeout: 0 });
          await expect(backdrop).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0.5)", { timeout: 0 });
          await expect(backdrop).toHaveCSS("background-color", /^rgba\(0, 0, 0, 0\.[0-4]\d*\)$/, { timeout: 0 });
          expect(await backdrop.evaluate((node) => node.getAnimations().length)).toBe(2);
        }

        await expect(button).not.toHaveElevatedZIndex();
        await expect(popover).not.toHaveElevatedZIndex();
        await expect(backdrop).toHaveBackdropStateStyles("closed");
      });

      it("Supports interacting with multiple Toggleable Elements (not simultaneously)", async ({ page }) => {
        /* ---------- Setup ---------- */
        const backdropId = "backdrop";
        await page.goto(url);
        await renderHTMLTo(page)`
          ${createPseudoBackdropStyles({ animates })}
          <button id="sibling-a" type="button" popovertarget="popover-a">Button A</button>
          <div id="popover-a" popover ${attrs["data-backdrop"]}="${backdropId}" ${attrs["data-elevates"]}="sibling-a">
            Popover A
          </div>

          <button id="sibling-b" type="button" popovertarget="popover-b">Button B</button>
          <div id="popover-b" popover ${attrs["data-backdrop"]}="${backdropId}" ${attrs["data-elevates"]}="sibling-b">
            Popover B
          </div>

          <${tagName} id="${backdropId}" animates="${animates}"></${tagName}>
        `;

        const backdrop = page.locator(tagName);
        const buttonA = page.getByRole("button", { name: "Button A" });
        const buttonB = page.getByRole("button", { name: "Button B" });
        const popoverA = page.locator(popoverSelector).and(page.getByText("Popover A"));
        const popoverB = page.locator(popoverSelector).and(page.getByText("Popover B"));
        const waitForNextError = createErrorWatcher(page, { timeout: Math.max(defaultDurations.long * 6, 5000) });

        /* ---------- Assertions ---------- */
        const pageErrorPromise = waitForNextError();

        // Open Toggleable A
        await buttonA.click();
        await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
        await expect(buttonA).toHaveElevatedZIndex({ timeout: 0 });
        await expect(popoverA).toHaveElevatedZIndex({ timeout: 0 });
        await expect(backdrop).toHaveBackdropStateStyles("open");

        await expect(popoverB).not.toHaveElevatedZIndex({ timeout: 0 });
        await expect(buttonB).not.toHaveElevatedZIndex({ timeout: 0 });

        // Close Toggleable A
        await page.keyboard.press("Escape");
        await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
        await expect(backdrop).toHaveBackdropStateStyles("closed");
        await expect(popoverA).not.toHaveElevatedZIndex();
        await expect(buttonA).not.toHaveElevatedZIndex();

        await expect(popoverB).not.toHaveElevatedZIndex();
        await expect(buttonB).not.toHaveElevatedZIndex();

        // Open Toggleable B
        await buttonB.click();
        await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
        await expect(buttonB).toHaveElevatedZIndex({ timeout: 0 });
        await expect(popoverB).toHaveElevatedZIndex({ timeout: 0 });
        await expect(backdrop).toHaveBackdropStateStyles("open");

        await expect(popoverA).not.toHaveElevatedZIndex({ timeout: 0 });
        await expect(buttonA).not.toHaveElevatedZIndex({ timeout: 0 });

        // Close Toggleable B
        await page.keyboard.press("Escape");
        await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
        await expect(backdrop).toHaveBackdropStateStyles("closed");
        await expect(popoverB).not.toHaveElevatedZIndex();
        await expect(buttonB).not.toHaveElevatedZIndex();

        await expect(popoverA).not.toHaveElevatedZIndex();
        await expect(buttonA).not.toHaveElevatedZIndex();

        // Verify that no errors were caused by these interactions
        const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
        expect(noErrorsError).toBeInstanceOf(ObservationError);
        expect((noErrorsError as ObservationError).observations).toHaveLength(0);
      });

      it("Demotes the previous Toggleable Element (if it exists) when elevating a new one", async ({ page }) => {
        /* ---------- Setup ---------- */
        const backdropId = "backdrop";
        await page.goto(url);
        await renderHTMLTo(page)`
          ${createPseudoBackdropStyles({ animates })}
          <button id="sibling-a" type="button" popovertarget="popover-a">Button A</button>
          <div id="popover-a" popover ${attrs["data-backdrop"]}="${backdropId}" ${attrs["data-elevates"]}="sibling-a">
            Popover A
          </div>

          <button id="sibling-b" type="button" popovertarget="popover-b">Button B</button>
          <div id="popover-b" popover ${attrs["data-backdrop"]}="${backdropId}" ${attrs["data-elevates"]}="sibling-b">
            Popover B
          </div>

          <${tagName} id="${backdropId}" animates="${animates}"></${tagName}>
        `;

        const backdrop = page.locator(tagName);
        const buttonA = page.getByRole("button", { name: "Button A" });
        const buttonB = page.getByRole("button", { name: "Button B" });
        const popoverA = page.locator(popoverSelector).and(page.getByText("Popover A"));
        const popoverB = page.locator(popoverSelector).and(page.getByText("Popover B"));
        const waitForNextError = createErrorWatcher(page, { timeout: Math.max(defaultDurations.long * 6, 3500) });

        /* ---------- Assertions ---------- */
        const pageErrorPromise = waitForNextError();

        await it.step("Opening Popover B While Popover A is OPEN", async () => {
          // Open Toggleable A
          await buttonA.click();
          await expect(backdrop).toHaveAttribute(attrs["data-open"], "", { timeout: 0 });
          await expect(buttonA).toHaveElevatedZIndex({ timeout: 0 });
          await expect(popoverA).toHaveElevatedZIndex({ timeout: 0 });
          await expect(backdrop).toHaveBackdropStateStyles("open");

          await expect(popoverB).not.toHaveElevatedZIndex({ timeout: 0 });
          await expect(buttonB).not.toHaveElevatedZIndex({ timeout: 0 });

          // Force Toggleable B open while A is still open
          await popoverB.evaluate((node: HTMLElement) => node.showPopover());
          await expect(backdrop).toHaveAttribute(attrs["data-open"], "", { timeout: 0 });
          await expect(backdrop).toHaveBackdropStateStyles("open", { timeout: 0 });
          await expect(buttonB).toHaveElevatedZIndex({ timeout: 0 });
          await expect(popoverB).toHaveElevatedZIndex({ timeout: 0 });
          await expect(buttonA).not.toHaveElevatedZIndex({ timeout: 0 });
          await expect(popoverA).not.toHaveElevatedZIndex({ timeout: 0 });
        });

        if (animates === "both") {
          await it.step("Opening Popover A While Popover B is TRANSITIONING Closed", async () => {
            // Close Popover B
            await page.keyboard.press("Escape");
            await expect(buttonB).toHaveElevatedZIndex({ timeout: 0 });
            await expect(popoverB).toHaveElevatedZIndex({ timeout: 0 });
            await expect(buttonA).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(popoverA).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"], { timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // Force Toggleable A open while B is still ANIMATING closed
            await popoverA.evaluate((node: HTMLElement) => node.showPopover());
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "", { timeout: 0 });
            await expect(buttonA).toHaveElevatedZIndex({ timeout: 0 });
            await expect(popoverA).toHaveElevatedZIndex({ timeout: 0 });
            await expect(buttonB).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(popoverB).not.toHaveElevatedZIndex({ timeout: 0 });

            // NOTE: This assertion MUST come AFTER the `z-index` assertions above to ensure that they are valid/reliable
            await expect(backdrop).toHaveBackdropStateStyles("open");

            // After all transitions have ended, check that the Transition Events for B didn't accidentally demote A
            await expect(buttonA).toHaveElevatedZIndex({ timeout: 0 });
            await expect(popoverA).toHaveElevatedZIndex({ timeout: 0 });
            await expect(buttonB).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(popoverB).not.toHaveElevatedZIndex({ timeout: 0 });
          });
        }

        // Verify that no errors were caused by these interactions
        const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
        expect(noErrorsError).toBeInstanceOf(ObservationError);
        expect((noErrorsError as ObservationError).observations).toHaveLength(0);
      });

      it("Works fine without a specified Elevated Sibling", async ({ page }) => {
        /* ---------- Setup ---------- */
        await renderDefaultHTMLToPage(page, { animates });
        const button = page.getByRole("button");
        const popover = page.locator(popoverSelector);
        const backdrop = page.locator(tagName);
        const waitForNextError = createErrorWatcher(page, { timeout: Math.max(defaultDurations.long * 4, 3000) });

        // Remove the Elevated Sibling Configuration
        await popover.evaluate((node, attr) => node.removeAttribute(attr), attrs["data-elevates"]);
        await expect(popover).toHaveAttribute(attrs["data-backdrop"]);
        await expect(popover).not.toHaveAttribute(attrs["data-elevates"]);

        /* ---------- Assertions ---------- */
        const pageErrorPromise = waitForNextError();

        // Open `popover` and verify `popover`/backdrop states, accounting for any animations
        await button.click();
        await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
        await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
        await expect(button).not.toHaveElevatedZIndex({ timeout: 0 });

        if (animates === "both") {
          await page.waitForTimeout(defaultDurations.short / 2);
          await expect(backdrop).toHaveBackdropStateStyles("in-transition");
        }

        await expect(backdrop).toHaveBackdropStateStyles("open");

        // Close `popover` and verify `popover`/backdrop states, accounting for any animations
        await page.keyboard.press("Escape");
        await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);

        if (animates === "both") {
          await page.waitForTimeout(defaultDurations.short / 2);
          await expect(backdrop).toHaveBackdropStateStyles("in-transition");
          await expect(popover).toHaveElevatedZIndex();
          await expect(button).not.toHaveElevatedZIndex();
        }

        await expect(popover).not.toHaveElevatedZIndex();
        await expect(button).not.toHaveElevatedZIndex();
        await expect(backdrop).toHaveBackdropStateStyles("closed");

        // Verify that no errors were caused by these interactions
        const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
        expect(noErrorsError).toBeInstanceOf(ObservationError);
        expect((noErrorsError as ObservationError).observations).toHaveLength(0);
      });

      if (animates === "both") {
        it("Handles animation reversals correctly", async ({ page }) => {
          /* ---------- Setup ---------- */
          const durations = { long: 1000, short: 500 } as const satisfies RenderOptions["durations"];
          await renderDefaultHTMLToPage(page, { animates, durations });

          const button = page.getByRole("button");
          const popover = page.locator(popoverSelector);
          const backdrop = page.locator(tagName);
          const waitForNextError = createErrorWatcher(page, { timeout: Math.max(durations.long * 4, 5000) });

          /**
           * Waits until {@link time} milliseconds have passed since the provided {@link start} time. (Used to account
           * for the time already spent on assertions, ensuring that animations are reversed at the correct moments in
           * this test.)
           */
          function waitSince(start: number, time: number): Promise<void> {
            return page.waitForTimeout(Math.max(0, time - (Date.now() - start)));
          }

          /* ---------- Assertions ---------- */
          const pageErrorPromise = waitForNextError();

          await it.step("Reversing an opening animation", async () => {
            // Open `popover`
            await button.press("Enter");
            const openedAt = Date.now();
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // 1/2 way through, close `popover`
            await waitSince(openedAt, durations.short / 2);
            await page.keyboard.press("Escape");
            const closedAt = Date.now();
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // 1/4 way through, re-open `popover`
            await waitSince(closedAt, durations.short / 4);
            await page.keyboard.press("Enter");
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // Wait for the final opening animation to finish
            await expect(backdrop).toHaveBackdropStateStyles("open");
            await page.waitForTimeout(100); // Give any (erroneous) `transitionend`-triggered demotions a chance to happen

            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
          });

          await it.step("Reversing a closing animation", async () => {
            // Close `popover`
            await page.keyboard.press("Escape");
            const closedAt = Date.now();
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // 1/2 way through, re-open `popover`
            await waitSince(closedAt, durations.short / 2);
            await page.keyboard.press("Enter");
            const openedAt = Date.now();
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // 1/4 way through, re-close `popover`
            await waitSince(openedAt, durations.short / 4);
            await page.keyboard.press("Escape");
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");

            // Wait for the final closing animation to finish
            await expect(popover).not.toHaveElevatedZIndex();
            await expect(button).not.toHaveElevatedZIndex();
            await expect(backdrop).toHaveBackdropStateStyles("closed");
          });

          // Verify that no errors were caused by these interactions
          const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
          expect(noErrorsError).toBeInstanceOf(ObservationError);
          expect((noErrorsError as ObservationError).observations).toHaveLength(0);
        });
      }

      it("Cleans up the `style` attribute from elevated elements on close if they didn't originally have one", async ({
        page,
      }) => {
        /* ---------- Setup ---------- */
        await renderDefaultHTMLToPage(page, { animates });
        const button = page.getByRole("button");
        const popover = page.locator(popoverSelector);
        const backdrop = page.locator(tagName);

        const buttonColor = "red";
        const buttonStyles = `background-color: ${buttonColor};`;
        const popoverColor = "blue";
        const popoverStyles = `background-color: ${popoverColor};`;

        /* ---------- Assertions ---------- */
        for (const styled of [false, true]) {
          const step = styled ? "With a pre-existing `style` attribute" : "Without a pre-existing `style` attribute";
          await it.step(step, async () => {
            // Confirm initial state of the Step
            if (styled) {
              await button.evaluate((node, styles) => node.setAttribute("style", styles), buttonStyles);
              await popover.evaluate((node, styles) => node.setAttribute("style", styles), popoverStyles);
            } else {
              await expect(button).not.toHaveAttribute("style", { timeout: 0 });
              await expect(popover).not.toHaveAttribute("style", { timeout: 0 });
            }

            // Open `popover` and verify `popover`/backdrop states, waiting for any forwards animations if needed
            await button.click();
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveAttribute("style", { timeout: 0 });
            await expect(popover).toHaveAttribute("style", { timeout: 0 });

            await expect(button).toHaveJSProperty("style.backgroundColor", styled ? buttonColor : "");
            await expect(popover).toHaveJSProperty("style.backgroundColor", styled ? popoverColor : "");
            await expect(backdrop).toHaveBackdropStateStyles("open");

            // Now close `popover` and verify backdrop state
            await page.keyboard.press("Escape");
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);

            // Verify `popover` and backdrop styles/states, accounting for any animations
            if (animates === "both") {
              await page.waitForTimeout(defaultDurations.short / 2);
              await expect(backdrop).toHaveBackdropStateStyles("in-transition");
              await expect(button).toHaveElevatedZIndex({ timeout: 0 });
              await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
              await expect(button).toHaveAttribute("style", { timeout: 0 });
              await expect(popover).toHaveAttribute("style", { timeout: 0 });

              await expect(button).toHaveJSProperty("style.backgroundColor", styled ? buttonColor : "");
              await expect(popover).toHaveJSProperty("style.backgroundColor", styled ? popoverColor : "");
            }

            await expect(button).not.toHaveElevatedZIndex();
            await expect(popover).not.toHaveElevatedZIndex();
            await expect(backdrop).toHaveBackdropStateStyles("closed");

            if (styled) {
              await expect(button).toHaveAttribute("style", buttonStyles, { timeout: 0 });
              await expect(popover).toHaveAttribute("style", popoverStyles, { timeout: 0 });
            } else {
              await expect(button).not.toHaveAttribute("style", { timeout: 0 });
              await expect(popover).not.toHaveAttribute("style", { timeout: 0 });
            }
          });
        }
      });

      it("Marks itself closed and demotes its associated elements when removed from the DOM", async ({ page }) => {
        /* ---------- Setup ---------- */
        await renderDefaultHTMLToPage(page, { animates });
        const button = page.getByRole("button");
        const popover = page.locator(popoverSelector);
        const backdrop = page.locator(tagName);
        const waitForNextError = createErrorWatcher(page, { timeout: Math.max(defaultDurations.long * 3, 2000) });

        /* ---------- Assertions ---------- */
        const pageErrorPromise = waitForNextError();

        // Open `popover` and verify `popover`/backdrop states, waiting for any forwards animations if needed
        await button.click();
        await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
        await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
        await expect(button).toHaveElevatedZIndex({ timeout: 0 });
        await expect(backdrop).toHaveBackdropStateStyles("open");

        // Remove the backdrop from the DOM (keeping a reference to it for later assertions)
        const backdropHandle = await backdrop.elementHandle();
        await backdropHandle.evaluate((node) => node.remove());
        await expect(backdrop).not.toBeAttached({ timeout: 0 });
        expect(await backdropHandle.getAttribute(attrs["data-open"])).toBeNull();

        // Verify that the elevated elements were demoted, even though `popover` is still open
        await expect(page.locator(popoverSelector).and(page.locator(popoverOpenSelector))).toBeAttached();
        await expect(popover).not.toHaveElevatedZIndex({ timeout: 0 });
        await expect(button).not.toHaveElevatedZIndex({ timeout: 0 });

        // Reattach the backdrop by itself and immediately remove it again. Nothing should change or throw.
        await backdropHandle.evaluate((node) => {
          document.body.append(node);
          node.remove();
        });

        await expect(backdrop).not.toBeAttached({ timeout: 0 });
        expect(await backdropHandle.getAttribute(attrs["data-open"])).toBeNull();
        await expect(popover).not.toHaveElevatedZIndex({ timeout: 0 });
        await expect(button).not.toHaveElevatedZIndex({ timeout: 0 });

        // Verify that no errors were caused by these interactions
        const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
        expect(noErrorsError).toBeInstanceOf(ObservationError);
        expect((noErrorsError as ObservationError).observations).toHaveLength(0);
      });

      if (animates === "both") {
        it("Demotes its associated elements immediately if its closing animation(s) are canceled", async ({ page }) => {
          // Setup
          await renderDefaultHTMLToPage(page, { animates });
          const button = page.getByRole("button");
          const popover = page.locator(popoverSelector);
          const backdrop = page.locator(tagName);
          const waitForTransitioncancel = await createDOMEventWaiter(backdrop, "transitioncancel");

          // Open `popover` and verify `popover`/backdrop states
          await button.press("Enter");
          await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
          await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
          await expect(button).toHaveElevatedZIndex({ timeout: 0 });
          await expect(backdrop).toHaveBackdropStateStyles("in-transition");

          // Cancel the animations
          const [events] = await Promise.all([
            waitForTransitioncancel(),
            backdrop.evaluate((node) => node.getAnimations().forEach((a) => a.cancel())),
          ]);

          // Elements should still be promoted. (And `backdrop` should have jumped to its final state.)
          await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
          await expect(button).toHaveElevatedZIndex({ timeout: 0 });
          await expect(backdrop).toHaveBackdropStateStyles("open");

          expect(events).toHaveLength(3);
          events.forEach((e) => expect(e.elapsedTime * 1000).toBeLessThan(defaultDurations.short));

          // Now close `popover` and verify backdrop state
          await page.keyboard.press("Escape");
          await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
          await expect(backdrop).toHaveBackdropStateStyles("in-transition");
          await expect(popover).toHaveElevatedZIndex();
          await expect(button).toHaveElevatedZIndex();

          // Cancel the animations
          await Promise.all([
            waitForTransitioncancel(),
            backdrop.evaluate((node) => node.getAnimations().forEach((a) => a.cancel())),
          ]);

          // Elements have been demoted IMMEDIATELY. (And `backdrop` has jumped to final state again.)
          await expect(popover).not.toHaveElevatedZIndex({ timeout: 0 });
          await expect(button).not.toHaveElevatedZIndex({ timeout: 0 });
          await expect(backdrop).toHaveBackdropStateStyles("closed");

          expect(events).toHaveLength(6);
          events.forEach((e) => expect(e.elapsedTime * 1000).toBeLessThan(defaultDurations.short));
        });

        it("Does not throw if removed from the DOM mid animation", async ({ page }) => {
          /* ---------- Setup ---------- */
          const durations = { long: 1000, short: 500 } as const satisfies RenderOptions["durations"];
          await renderDefaultHTMLToPage(page, { animates, durations });

          const button = page.getByRole("button");
          const popover = page.locator(popoverSelector);
          const backdrop = page.locator(tagName);
          const backdropHandle = await backdrop.elementHandle();
          const waitForNextError = createErrorWatcher(page, { timeout: Math.max(durations.long * 4, 5000) });

          /* ---------- Assertions ---------- */
          const pageErrorPromise = waitForNextError();

          await it.step("Removal during an opening animation", async () => {
            // Open `popover`
            await button.press("Enter");
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });

            // 1/2 way through, remove the backdrop from the DOM
            await page.waitForTimeout(durations.short / 2);
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");
            await backdropHandle.evaluate((node) => node.remove());

            await expect(backdrop).not.toBeAttached({ timeout: 0 });
            expect(await backdropHandle.getAttribute(attrs["data-open"])).toBeNull();
            await expect(popover).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(page.locator(popoverSelector).and(page.locator(popoverOpenSelector))).toBeAttached();
          });

          await it.step("Removal during a closing animation", async () => {
            // Close `popover` while the backdrop is detached, then reattach the backdrop
            const waitForToggle = await createDOMEventWaiter(popover, "toggle");
            await Promise.all([waitForToggle(), page.keyboard.press("Escape")]);
            await expect(page.locator(popoverSelector).and(page.locator(popoverOpenSelector))).not.toBeAttached();

            await backdropHandle.evaluate((node) => document.body.append(node));
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);
            await expect(backdrop).toHaveBackdropStateStyles("closed");

            // Open `popover`, waiting for the opening animation to finish
            await button.click();
            await expect(backdrop).toHaveAttribute(attrs["data-open"], "");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await expect(backdrop).toHaveBackdropStateStyles("open");

            // Close `popover`
            await page.keyboard.press("Escape");
            await expect(backdrop).not.toHaveAttribute(attrs["data-open"]);

            // 1/2 way through, remove the backdrop from the DOM
            await page.waitForTimeout(durations.short / 2);
            await expect(backdrop).toHaveBackdropStateStyles("in-transition");
            await expect(popover).toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).toHaveElevatedZIndex({ timeout: 0 });
            await backdropHandle.evaluate((node) => node.remove());

            await expect(backdrop).not.toBeAttached({ timeout: 0 });
            expect(await backdropHandle.getAttribute(attrs["data-open"])).toBeNull();
            await expect(popover).not.toHaveElevatedZIndex({ timeout: 0 });
            await expect(button).not.toHaveElevatedZIndex({ timeout: 0 });
          });

          // Verify that no errors were caused by these interactions.
          const noErrorsError = await pageErrorPromise.catch((e: ObservationError) => e);
          expect(noErrorsError).toBeInstanceOf(ObservationError);
          expect((noErrorsError as ObservationError).observations).toHaveLength(0);
        });
      }
    });
  }

  it.describe("API", () => {
    it.describe("Exposed Properties and Attributes", () => {
      it.describe("animates (Property)", () => {
        it("Exposes the underlying `animates` attribute", async ({ page }) => {
          /* ---------- Setup ---------- */
          const initialState = "none" as const satisfies PseudoBackdrop["animates"];
          await page.goto(url);
          await renderHTMLTo(page)`<${tagName} animates="${initialState}"></${tagName}>`;

          /* ---------- Assertions ---------- */
          // `property` matches initial `attribute`
          const backdrop = page.locator(tagName);
          await expect(backdrop).toHaveJSProperty("animates", initialState);

          // `attribute` responds to `property` updates
          const newProp = "forwards" as const satisfies PseudoBackdrop["animates"];
          await backdrop.evaluate((node: PseudoBackdrop, prop) => (node.animates = prop), newProp);
          await expect(backdrop).toHaveAttribute("animates", newProp);

          // `property` responds to `attribute` updates
          const newAttr = "backwards" as const satisfies PseudoBackdrop["animates"];
          await backdrop.evaluate((node: PseudoBackdrop, attr) => node.setAttribute("animates", attr), newAttr);
          await expect(backdrop).toHaveJSProperty("animates", newAttr);

          // `attribute` is explicitly set (not removed) when `property` is set to the default value
          const defaultProp = "both" as const satisfies PseudoBackdrop["animates"];
          await backdrop.evaluate((node: PseudoBackdrop, prop) => (node.animates = prop), defaultProp);
          await expect(backdrop).toHaveAttribute("animates", defaultProp);
          await expect(backdrop).toHaveJSProperty("animates", defaultProp);
        });

        it("Defaults to `both` when the underlying attribute is omitted or invalid", async ({ page }) => {
          await page.goto(url);
          for (const attr of [null, String(Math.random())] as const) {
            await it.step(`Mounted with ${attr ? "invalid" : "omitted"} attribute`, async () => {
              await renderHTMLTo(page)`<${tagName} ${attr ? `animates="${attr}"` : ""}></${tagName}>`;
              const backdrop = page.locator(tagName);

              if (attr) await expect(backdrop).toHaveAttribute("animates", attr);
              else await expect(backdrop).not.toHaveAttribute("animates");
              await expect(backdrop).toHaveJSProperty("animates", "both");

              // Imperatively set to another invalid value afterwards
              const invalidProp = String(Math.random()) as PseudoBackdrop["animates"];
              await backdrop.evaluate((node: PseudoBackdrop, prop) => (node.animates = prop), invalidProp);
              await expect(backdrop).toHaveAttribute("animates", invalidProp);
              await expect(backdrop).toHaveJSProperty("animates", "both");
            });
          }
        });

        it("Removes the underlying `animates` attribute when set to `null` or `undefined`", async ({ page }) => {
          /* ---------- Setup ---------- */
          await page.goto(url);
          await renderHTMLTo(page)`<${tagName}></${tagName}>`;
          const backdrop = page.locator(tagName);
          const initialState = "none" as const satisfies PseudoBackdrop["animates"];

          /* ---------- Assertions ---------- */
          for (const nullishValue of [null, undefined] as const) {
            await it.step(`Setting the property to \`${nullishValue}\``, async () => {
              // Give the backdrop a non-default `animates` attribute
              await backdrop.evaluate((node, attr) => node.setAttribute("animates", attr), initialState);
              await expect(backdrop).toHaveAttribute("animates", initialState);
              await expect(backdrop).toHaveJSProperty("animates", initialState);

              // Nullish `property` values remove the `attribute`
              await backdrop.evaluate((node: PseudoBackdrop, prop) => (node.animates = prop), nullishValue);
              await expect(backdrop).not.toHaveAttribute("animates");
              await expect(backdrop).not.toHaveJSProperty("animates", initialState);
              await expect(backdrop).toHaveJSProperty("animates", "both");
            });
          }
        });
      });
    });
  });
});
