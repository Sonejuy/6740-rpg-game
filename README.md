# Eigen-Quest

A small browser game built on the "Damage Synergy System" example from the
OMS 6740 linear algebra review. Players freely distribute attribute points
and try to maximize total damage output — the deeper linear-algebra story
(why builds converge, eigenvalues/eigenvectors) is left for course
discussion elsewhere; this app is deliberately just the game.

**Play it:** open `index.html` in a browser, or visit the GitHub Pages URL
once Pages is enabled for this repo (see below). No install, no login, no
backend.

## How it works

The player starts at the base attribute vector `x0 = (1,1,1,1,1)` and has
`TOTAL_POINTS = 50` points to distribute freely across the 5 attributes —
add or remove them at any time with the +/− controls, in any order, any
number of times. Let `p` be the current allocation and `t = sum(p)` the
total points currently spent. The raw (pre-synergy) vector is `x0 + p`, and
the **effective attribute profile** shown in the left column is:

```
x_t = B^t · (x0 + p)
```

where `B` is the fixed, symmetric synergy matrix (see the in-app "How to
play" section for every synergy percentage). Total damage output is
`1^T x_t` — the effective attributes summed.

The right-hand "Damage output" chart traces total damage as the player
adds/removes points, against a dashed **theoretical max** reference line.
That reference is the slides' own asymptotic approximation
(`D_t ≈ c1 · λ1^t · v1` for large `t`), evaluated at `t = TOTAL_POINTS`
using the player's *current* raw vector — so it's a moving target that
reflects whichever build direction is currently on screen, not a fixed
number. Because it drops the non-dominant eigen-modes it's an
approximation, not a strict ceiling: with equal eigengaps the other modes
haven't fully decayed away even by `t = 50`, so a build can occasionally
land a little above or below the line. That's expected, not a bug. The
chart's y-axis is fixed for the whole session (to whichever single
attribute, if all 50 points went into it, would maximize this formula), so
the curve visibly rises when points are added and visibly falls when
they're removed instead of the axis silently rescaling.

The game never ends — there's no turn limit and no end screen. Players can
click **Submit Score** at any point to log their current total damage.

## Project structure

- `index.html` — page structure (title screen, welcome/name-entry screen, play screen)
- `style.css` — all styling
- `levels.js` — labels, colors, base vector, point budget, the fixed synergy matrix, and its precomputed dominant eigenpair
- `app.js` — game logic: matrix-vector power, point allocation, the damage-output chart, the how-to-play synergy list, and score logging

No build step, no dependencies — plain HTML/CSS/JS.

## The synergy matrix

`B` is symmetric by construction, so its eigenvectors are exactly
orthogonal (not merely close), and its eigenvalues are real and evenly
spaced: `1.06, 1.03, 1.00, 0.97, 0.94` (a constant gap of `0.03`). It was
built offline in NumPy by choosing a target dominant direction, completing
it to an orthonormal basis via QR, and reassembling `B = V · diag(λ) · Vᵀ`
— then verified with `eigvalsh`. All off-diagonal entries are non-negative
(every pair of attributes boosts each other, just by different amounts);
diagonal entries give each attribute its own per-round self-growth or
self-decay, shown in the in-app "Self-growth / self-decay" list.

## Score logging — read this before telling students to "submit their score"

This is a static site with **no server**. Clicking "Submit Score" saves the
current score to that browser's own `localStorage`, and the player can
download a CSV of everything logged in that browser (name, score, points
allocated, the per-attribute allocation, and a timestamp). **There is no
central collection across students or devices** — each student's scores
stay on their own machine unless they manually send you their downloaded
CSV.

If you want scores collected automatically in one place (e.g. a shared
spreadsheet), that needs an actual backend of some kind — even something
lightweight like a Google Form/Sheet endpoint or a small serverless
function. That's a real scope addition beyond a static site, so it wasn't
built by default; ask if you want it added.

## Deploying with GitHub Pages

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. On GitHub: **Settings → Pages → Source → Deploy from a branch**, pick
   `main` and `/ (root)`, then **Save**.
3. GitHub gives you a URL like `https://<username>.github.io/6740-rpg-game/`.
   Share that link — e.g. in a pinned Ed Discussion post.
