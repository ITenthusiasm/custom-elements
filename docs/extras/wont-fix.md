# Won't Fix

This file documents the collection of _known_ issues/concerns that &mdash; at least as of today &mdash; we don't intend to address. Although we're open to addressing these bugs/concerns in the future, it would need to be proven that there are sufficiently-significant use cases that would motivate resolving these niche, unusual problems. Alongside each known concern, we'll document the reason for neglecting it.

## `ComboboxField`

### Data Loss When Transitioning `valueis` from `anyvalue` to `(un)clearable` in Unorthodox Ways

This is a potential concern, but _not_ a bug.

Consider the following scenario:

1. A user is interacting with a `combobox` that is in `anyvalue` mode.
2. The user supplies a filter that has a corresponding `autoselectableOption`.
3. The user closes the `combobox`, leaving the `autoselectableOption` which matched their filter unselected.
4. The user re-expands the `combobox`.
5. The _developer_ changes the `valueis` attribute from `anyvalue` to `(un)clearable`.

In this scenario, the `autoselectableOption` is lost when the user expands the `combobox`. Thus, when the developer changes the `valueis` attribute thereafter from `anyvalue` to `(un)clearable`, the component isn't able to find a corresponding `option` to select. Thus, the `combobox` will reset its own value, potentially confusing the user as they see the component's text content change on its own.

A simple solution to this problem is to loop through all of the `option`s during this transition, searching for one whose `label` matches the `combobox`'s current text content. If no matching `option` is found, then the `combobox` will still have to be reset, but the reset will at least be more reasonable in this case.

The problem with this solution is that it's not performant to search through all of the `option`s, and adding this logic _ever so slightly_ increases our maintenance overhead and JS bundle size. Sure, hopefully developers won't rapdily change the `valueis` attribute, so perhaps this performance hit isn't really a big deal. However, it's also incredibly unlikely that anyone sane will need to satisfy this use case, and I'd rather not impose the performance costs on the greater majority of people who aren't concerned about this scenario.

A better _userland_ solution is for people to run this looping logic themselves when they transition the `valueis` attribute as mentioned above. This should be safe, reliable, and easy; and it leaves the "tax"/cost only on those who want it, rather than those who don't.
