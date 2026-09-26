import { test as it, expect } from "@playwright/test";

/*
 * General Testing Guidelines:
 * - When testing animation phases, always prefer testing **_at least_** 2 properties being animated at the same time,
 *   with different animation durations. Unless otherwise specified, ALWAYS test 2 properties for animations!
 * - When possible, you should always test both `[animates="both"]` and `[animates="none"]` unless it **_clearly_**
 *   doesn't make sense (e.g., you're testing a `role` check, which has nothing to do with animations at all).
 * - We intentionally DO NOT test `[animates="forwards"]` or `[animates="backwards"]` in theese tests. If `both`
 *   and `none` work fine, then that implies that `forwards` and `backwards` _must_ have the ability to function
 *   well. (If they don't in our code, it's almost certainly a minor conditional assertion slip-up. That's an easy fix
 *   that isn't worth bloating up our test code to capture/prevent.)
 * - Because this is an Internal Component, we are intentionally NOT testing integrations with `ShadowRoot`s
 *   (for simplicity's sake). With `getRootNode()`, things should work as is. Support should only break if we stop
 *   calling `getRootNode()`, or call it at the wrong time. Both problems should be simple enough to debug and fix.
 */

it.describe("Pseudo Backdrop Web Component (Internal)", () => {
  it("Has no accessible `role`", async ({ page }) => {
    // TODO: Implement. `animates` path is irrelevant.
    // Assert `expect(page.locator("pseudo-backdrop")).toHaveRole("none")`
  });

  it("Does nothing when its owning element is toggled to the state which it already has", async ({ page }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Dispatch manual `toggle` events such that `oldState === newState`
    // - Verify toggleable element still has its previous state in the DOM
    // - Verify that the backdrop hasn't changed its state in the DOM
    // - When testing in the `[animates="both"]` path, verify that no `transitionrun` event ever even fired
    // - MAYBE verify no errors were thrown
  });

  it("Ignores `toggle` events from irrelevant elements", async ({ page }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Toggle open some element that isn't assocated with the target backdrop
    // - Element should be open but shouldn't have any `z-index`es
    // - Backdrop should still be closed
    // - Verify that no `transitionrun` event ever fired in `[animates="both"]` path (to prove no state change happened).
    // ...
    // We'll want to run test for
    // - Element doesn't define `data-backdrop`
    // - Element defines `data-backdrop` and it points to a _different_ instance of `PseudoBackdrop` in the DOM
  });

  it("Supports interacting with multiple Toggleable Elements (not simultaneously)", async ({ page }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Open Toggleable A
    // - Close Toggleable A (wait for animation to finish if in `[animate="both"]` path)
    // - Verify state
    // - Open Toggleable B
    // - Close Toggleabe B (again, wait for animation to finish if needed)
    // - Verify states
    // - No errors should've been thrown during the entire test
  });

  it("Demotes the previous Toggleable Element (if it exists) when elevating a new one", async ({ page }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - For the `[animates="none"]` case, test opening a new Toggleable Element while a different one is already open
    // - For the `[animates="both"]` case, test opening a new Toggleable Element while a different one is **_transitioning closed_**
    // - No errors should be thrown during the entire test
  });

  it("Promotes the Toggleable Element and its Elevated Sibling to a higher Stacking Context when opened", async ({
    page,
  }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Toggle toggleable element open
    // - If: `animates === "both"`, wait for animation to complete
    //   - Else DO NOT `await` ANYTHING
    // - Assert backdrop `data-open` was updated immediately
    // - Assert `z-index`es were updated immediately
    // - Assert backdrop styles were finalized _later_ (e.g., opacity wasn't immediately At End, but was after duration finished)
    // ...
    // In animation phase, animate 2 properties, with one property being half the duration time
  });

  it("Skips promotions for animated backdrops if no animation has actually run", async ({ page }) => {
    // TODO: Implement. `[aniamtes="both"]` path only
    // Basically, you need to toggle an animation on and off at near-instantaneous speed.
    // Probably do this programmatically to avoid any inconsistencies that Playwright's `async/await` may introduce
    // Example:
    // ```js
    // function runTest(button, delay = 0) {
    //   setTimeout(() => {
    //     button.click();
    //     setTimeout(() => button.click(), delay);
    //   }, delay);
    // }
    //
    // runTest(document.querySelector("#my-button"), 3);
    // ```
    //
    // Note that this only seems to work in Chrome/Firefox, which will fire:
    // - `transitionrun` -> `transitionstart` (non-empty animations)
    // - `transitioncancel` -> (empty animations)
    // - `transitionrun` -> `transitionstart` -> `transitionend` (all empty animations)
    //
    // Whereas Safari will stop at:
    // - `transitionrun` -> `transitionstart` (non-empty animations)
    // - `transitioncancel` (empty animations)
    //
    // So we need to skip this test in Safari land
    // ... You MIGHT need to use `waitForEvent` for this... (risky, but might be doable reliably...)
    //
    // Ultimately in the end, you will need to verify that promotion was truly skipped. This means
    // that no `z-index`s should be applied to `pseudoPopover` or `elevatedSibling`, and the backdrop's
    // `data-open` and its styling should be correct.
  });

  it("Demotes the Toggleable Element and its Elevated Sibling from their Stacking Contexts when closed", async ({
    page,
  }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Toggle a toggleable element closed
    // - If: `animates === "both"`, wait for animation to complete
    //   - Else DO NOT `await` ANYTHING
    // - Assert backdrop `data-open` was updated immediately
    // - Assert `z-index`es were updated AT ANIMATION END
    // - Assert backdrop styles disappeared AT ANIMATION END
    //   - (As with before, you can do intermediate `toHaveCSS()` check when testing for animatable backdrops)
    // ...
    // In animation phase, animate 2 properties, with one property being half the time
  });

  it("Works fine with or without a specified Elevated Sibling", async ({ page }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Toggle open, thing should look fine (verify states)
    // - Toggle closed, things should look fine (verify states)
    // - No errors should have been thrown during the entire test
  });

  it("Handles animation reversals correctly", async ({ page }) => {
    // TODO: Implement. `[animates="both"]` path only
    // NOTE: All fractions are with respect to FULL animation `duration`
    //
    // - Toggle element open
    // - 1/2 way, toggle closed
    // - 1/4 way, re-toggle open
    // - Verify correct `backdrop[data-open]` state, `z-index`es, and backdrop styling along the way:
    //   - At each step
    //   - And after waiting for the _last_ opening animation to finish
    //
    // - Toggle element closed
    // - 1/2 way, toggle open
    // - 1/4 way, re-toggle closed
    // - Verify correct `backdrop[data-open]` state, `z-index`es, and backdrop styling along the way:
    //   - At each step
    //   - And after waiting for the _last_ closing animation to finish
  });

  it("Does not throw if removed from the DOM mid animation", async ({ page }) => {
    // TODO: Implement. `[animates="both"]` path only.
    // - Toggle element open/closed
    // - 1/2 way, remove element from the DOM
    // - backdrop should NOT have `data-open`
    // - Toggleable elements should have no z-index
    // - No errors should have been thrown during the whole test
    // ...
    // You may want to test this for BOTH opening and closing, in which case you'll need to reattach backdrop at some point + rerun
  });

  it("Cleans up the `style` attribute from elevated elements on close if they didn't originally have one", async ({
    page,
  }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Need to test for two cases (for both `pseudoPopover` and `elevatedSibling`):
    //   - Elements already had a `style` attribute (and therefore it wasn't removed on close)
    //   - Elements DID NOT originally have a `style` attribute (and therefore it WAS removed on close)
  });

  it("Marks itself closed and demotes its associated elements when removed from the DOM", async ({ page }) => {
    // TODO: Implement. Test all 2 `animates` paths.
    // - Open a "toggleable" element with a `data-backdrop` and a `data-elevates`
    // - Remove the `<pseudo-backdrop>` from the DOM
    // - Verify that its `data-open` attribute is gone
    // - Verify that both elevated elements no longer have a `z-index`
    // ...
    // In this test, you might consider removing _everything_ from the DOM, in which case you'll need `ElementHandle`s for assertions
    // ...
    // - Reattaching the `pseudo-backdrop` by itself and then immediately removing it shouldn't throw any errors either
  });

  // NOTE: We only need to test `Document` event listener removal here, since the `transition*` events are "auto-removed"
  it("Removes its event listeners when removed from the DOM", async ({ page }) => {
    // TODO: Implement. `animates` path is irrelevant.
    // ... Is there a way to test `document` event listener cleanup for memory purposes? Even aggressively?
  });

  it.describe("API", () => {
    it.describe("Exposed Properties and Attributes", () => {
      it.describe("animates (Property)", () => {
        it("Exposes the underlying `animates` attribute", async ({ page }) => {
          // TODO: Implement, using analgous `Combobox.test.ts` `valueis` (L4671-4697) test as a frame of reference
          // Try testing all 4 possible values. (Maybe just add some extra prop/attr changes + assertions at the very
          // end of the test after you finish writing the test body which is analogous to what `Combobox.test.ts` has.)
        });

        it("Defaults to `both` when the underlying attribute is omitted or invalid", async ({ page }) => {
          // TODO: Implement, using analgous `Combobox.test.ts` `valueis` test (L4699-4724) as a frame of reference
        });

        it("Removes the underlying `animates` attribute when set to `null` or `undefined`", async ({ page }) => {
          // TODO: Implement. (We need to test BOTH `undefined` AND `null`.)
        });
      });
    });
  });
});
