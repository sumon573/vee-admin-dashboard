# Grant Honor dropdown scroll fix — 2026-11-11

## Boss's report
- 2026-11-11 13:17, Brave on Android, `admin-dashboard.vercel.app` → Honors → Grant Honor modal → "Select Honor" dropdown opened, list ran off the bottom edge of the screen; it would not scroll down, so the **assistant badge (Official Assistant, item 16 of 20) was unreachable**.
- Screenshot: `~/workspace/user/files/1000230505_111_1dpk.jpg`
- Boss's words (Bengali): fix it in the admin panel — he wants to give the assistant badge, but it is not scrolling down.
- Boss clarification 13:19: **however many honors come here in the future, ALL of them must scroll** — the fix must be robust to a growing list, not sized to today's list.

## Exact cause (reproduced + proven, not guessed)
File: `artifacts/admin-dashboard/src/components/ui/select.tsx` (`SelectContent`).

The dropdown's height cap used the **Tailwind v3 CSS-variable shorthand**:

```css
max-h-[--radix-select-content-available-height]
```

The project uses **Tailwind CSS v4.3.2**, which does not understand that shorthand. It compiles the class to a selector with an **empty rule** — verified in the browser: the rule `.max-h-\[--radix-select-content-available-height\]` exists in the generated stylesheet with `style.cssText === ""`, and the open dropdown computed `max-height: none` (while `--radix-select-content-available-height` itself was correctly set to `398px` by Radix).

Consequences, all measured on a 390×844 emulated mobile viewport (before fix):
- Dropdown rendered at full natural height: 20 items × 32px + padding = **650px**, top 440px → bottom **1090px, 246px past the bottom** of the 844px screen — exactly the boss's screenshot.
- The Radix Viewport had `scrollHeight (648) == clientHeight (648)` → `canScroll: false`, `maxScrollTop: 0` — **there was nothing to scroll**, so touch-dragging did nothing.
- Secondary effect: the Dialog's scroll lock (`react-remove-scroll` 2.7.2, `body[data-scroll-locked="1"]`) decides whether a touch location can scroll by walking up for an element with `scrollHeight > clientHeight`. With the Viewport at 648 == 648 it classified the location as unscrollable and the lock cancelled the gesture. The scroll lock is **not** the root cause; it only matters because the Viewport had no overflow.
- The component *looked* scrollable on paper (`overflow-y-auto` + max-height class) — the max-height simply never applied.

The same broken v3 syntax also empties `origin-[--radix-select-content-transform-origin]` (open-animation origin only, cosmetic).

## Fix (1 file, +17/−2)
`artifacts/admin-dashboard/src/components/ui/select.tsx` only — no change to the Grant Honor flow, the assistant display-text field, the validity selector, the Grant button, or any honors data.

1. `max-h-[--radix-select-content-available-height]` → `max-h-[var(--radix-select-content-available-height)]` — the explicit `var(...)` form, which is what `dropdown-menu.tsx` already uses and which Tailwind v4 compiles to `max-height: var(--radix-select-content-available-height);` (confirmed present in the production build output).
2. `origin-[--radix-select-content-transform-origin]` → `origin-[var(--radix-select-content-transform-origin)]` — same broken syntax, same class list.
3. Viewport: added `touch-pan-y overscroll-contain` — vertical touch-panning explicit on the scroll container, and scroll-chaining into the Dialog behind it stopped at the ends.

**Why this is robust to future growth (boss's 13:19 requirement):** the cap is **viewport-derived, never item-count-derived**. Radix sets `--radix-select-content-available-height` to `window.innerHeight − 20` on every open, so the dropdown is always bounded to the screen and the Viewport scrolls, whether the list has 10, 20, 60, or 100+ honors. No fixed pixel height tuned to today's list anywhere in the fix.

## Verification (local dev server + emulated mobile, 390×844, touch)
Repro page used the **same** `Dialog` + `Select` components as the real Grant dialog, with the live 20-honor `honors_catalog` order (incl. the NULL name/type frames) and a 60-item long list (20 live + 40 dummy "Future Honor" entries). The repro page/route were deleted after testing; the final commit contains only `select.tsx`.

| Check | Before fix | After fix |
|---|---|---|
| Content `max-height` (computed) | `none` | `398px` |
| Content bottom vs 844px screen | 1090px (**+246px off-screen**) | **838px (inside)** |
| Viewport `scrollHeight` vs `clientHeight` | 648 vs 648 — **cannot scroll** | 648 vs 372 — **can scroll, maxScrollTop 276** |
| Viewport `touch-action` / `overscroll-behavior` | `auto` / `auto` | `pan-y` / `contain` |
| Assistant badge reachable (20 honors) | No | **Yes — visible inside dropdown after 1 real touch swipe; selectable** (`selected20=vee-assistant`, trigger shows "Official Assistant (badge) 🛡️ Special") |
| Long list (60 honors) | — | Content bottom 838px, Viewport scrollHeight **1928** vs clientHeight 372, canScroll. **5 real touch swipes → scrollTop 1556 = max**; last item "Future Honor 40 (badge)" visible inside dropdown and **selected by a real touch tap** (`selected60=future-honor-40`) |
| Real touch input | — | Trusted CDP `Input.dispatchTouchEvent` swipes: scrollTop 0 → 396 → 815 (20/60-list run) and 343 → 598 → 1011 → 1420 → 1556 (60-list run). Touch scrolling works inside the Dialog despite the scroll lock. |

Notes on the test method:
- The Chrome DevTools CLI `drag` command performs a pointer drag, which Radix interprets as drag-to-select (it selected the item under the pointer and closed the dropdown) — it cannot simulate a finger scroll. The touch proof above used real trusted touch events via CDP (`Input.dispatchTouchEvent`) from a separate headless Chrome against the local dev server.
- One intermediate probe showed a transient `scrollTop` reset when the dropdown had *just* opened (Radix re-positioning while settling); with a settled dropdown, overshoot assignments, stepwise scrolls, and fling-style swipes all stick at the expected `scrollTop`. No action needed.
- Screenshot of the fixed dropdown (60-item list, mobile viewport): dropdown ends inside the screen with a visible scroll-down chevron — the list is cut mid-item at the dropdown's own bottom edge, the classic scrollable-list look.

## Build / typecheck
- `vite build` (artifacts/admin-dashboard): ✅ passes in 8.92s. Built CSS contains `max-height:var(--radix-select-content-available-height)`.
- `tsc -p tsconfig.json --noEmit`: **34 errors before AND after the fix (identical count), zero in `select.tsx`** — pre-existing errors (Firebase `Database | null`, etc. in HonorsPage/MonitoringPage/ShortIdsPage/WalletPage). The fix adds no new type errors. (pnpm is not installed in this VM, so the repo's `pnpm` scripts were run via the underlying binaries: root `tsc` + `vite`.)
- Prettier flags `select.tsx` — but it already flagged the file on the clean tree (as it does `dialog.tsx` and `dropdown-menu.tsx`); the fix introduces no new formatting violation, so no reformat was applied (would only bloat the diff).

## Deploy readiness
- **Commit ready to push: `d48c0cb` on branch `fix/grant-honor-select-scroll`** (based on `main` @ `da36fc7`, 1 file changed). **NOT pushed** — the coordinator deploys.
- Push + deploy commands (coordinator):
  ```bash
  cd ~/workspace/vee-admin-dashboard
  git push origin fix/grant-honor-select-scroll
  # then either merge the branch into main (PR or fast-forward), or push main directly:
  git checkout main && git merge --ff-only fix/grant-honor-select-scroll && git push origin main
  ```
- **Vercel auto-deploy — NOT confirmed from this VM.** There is no `vercel.json` and no `.vercel/` in the repo; deploy behaviour lives in the Vercel project dashboard (project connected to `github.com/sumon573/vee-admin-dashboard`; past commit `6060bce` "Fix Vercel build output" touched `vite.config.ts`). Before/after pushing, verify in the Vercel dashboard that the project is connected to this repo, production branch is `main`, and Root Directory / Build Command match this layout (expected: Root Directory `artifacts/admin-dashboard`, build `vite build`, output `dist`). The standard Vercel GitHub integration auto-deploys on push to `main`; if it does not, trigger a manual deploy of `main` from the dashboard. No paid deploys or new services are involved.
- What to verify live on `admin-dashboard.vercel.app` (after deploy): Honors → Find User → Grant Honor → Select Honor → dropdown fits on screen → **scroll down → "Official Assistant (badge) 🛡️ Special" is reachable and selectable** → the "Display text (shown in the badge detail popup)" field appears → Grant works.

## Rollback
Revert one commit: `git revert d48c0cb` (or `git checkout main -- artifacts/admin-dashboard/src/components/ui/select.tsx` pre-merge). The change is CSS classes only; reverting restores the previous (broken) dropdown behaviour and nothing else. No data, RTDB, or account changes were made in this task.

## Boss device test (still to do — on his phone)
Open the admin panel on his phone → Honors → Find User → Grant Honor → Select Honor → scroll down → the assistant badge must be reachable and selectable, then the "Display text" field appears and Grant works.

## Follow-ups (NOT fixed here, by design)
1. **Empty "()" items in the dropdown** — the `svipN-frame` entries in `honors_catalog` have NULL `name`/`type`, so they render as `()`. Data issue, separate from the scroll; needs a catalog-data fix (or a display fallback) as its own task.
2. **Same broken Tailwind v3 `[--var]` syntax elsewhere** — `context-menu.tsx:62` has the identical broken `max-h-[--radix-context-menu-content-available-height]` (its dropdown would overflow the same way on a long list); `origin-[--radix-...]` appears in hover-card, menubar, popover, tooltip, calendar, chart wrappers (animation-origin only). Worth a single follow-up sweep, not bundled into this fix.
3. The 34 pre-existing `tsc` errors in the admin dashboard (unrelated files) remain.
