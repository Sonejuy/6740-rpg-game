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

The right-hand "Damage output" chart plots two curves against points spent
(`t`, from 0 to 50):

- **your output** (teal, solid) — the player's real, allocation-dependent
  total damage, `1^T x_t`, traced as a trail over every state visited this
  session. It progresses and retraces exactly as points are added and
  removed.
- **theoretical max** (gold, dashed) — a fixed, idealized benchmark curve
  that does **not** depend on the player's choices at all:

```
D_t = c_t · λ1^t · v1,      c_t = (1^T x0 + t) / (1^T v1)
```

using the slides' own asymptotic approximation (section 2.4–2.5), dominant
mode only, with `x0 = BASE = (1,1,1,1,1)` (the fixed starting vector, *not*
the player's allocation). This represents "if every point spent so far had
been funneled straight along the strongest growth direction" — independent
of which attribute was actually chosen. `(1^T v1)` cancels out of the
scalar total algebraically, so it simplifies to `D_t = (1^T x0 + t) · λ1^t`.
`D_max` is just this curve's value at `t = TOTAL_POINTS = 50`, a single
fixed constant:

```
D_max = D_50 = (5 + 50) · 1.06^50 ≈ 1013.11
```

Because the curve only keeps the dominant eigen-mode, it's an
approximation, not a strict ceiling: with equal eigengaps (`0.03` apart)
the other modes haven't fully decayed away even by round 50, so a real
build picks up extra growth from those modes that this idealized curve
doesn't track. Concretely, dumping all 50 points into Fire (the attribute
with the largest component of `v1`) reaches an exact total of `≈ 1139.87`
at `t = 50` — a little *above* `D_max`. That's expected, not a bug.

The chart's y-axis is fixed once at the start of each game (calibrated off
whichever is larger, `D_max` or the true best-case total reachable by
dumping all 50 points into a single attribute) and never rescales
afterward — so both curves share one stable frame all session, and
removing points always shows a clear, proportional drop instead of the
axis shrinking (or an earlier peak permanently flattening later exploration).

## Eigenvalues and eigenvectors

Computed with NumPy (`np.linalg.eigh`, since `B` is symmetric):

| | λ | eigengap to next |
|---|---|---|
| λ1 (dominant) | 1.060000 | 0.030 |
| λ2 | 1.030000 | 0.030 |
| λ3 | 1.000000 | 0.030 |
| λ4 | 0.970000 | 0.030 |
| λ5 | 0.940000 | — |

Dominant eigenvector (unit norm, matches `V1` in `levels.js`):

```
v1 = (0.532888, 0.406914, 0.368169, 0.445675, 0.465056)
```

(Fire has the largest component, so it's the single best attribute to
dump points into if maximizing eventual total damage is the only goal —
see the in-app synergy list for why.)

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
