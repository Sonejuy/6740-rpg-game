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
number of times. Let `p` be the current allocation, `t = sum(p)` the total
points currently spent, and `x = x0 + p` the raw (pre-synergy) attribute
vector. The **effective element power** shown in the left column is:

```
G_t(x) = (B^t · x) / ‖x‖2
```

— the raw allocation run through `t` rounds of the fixed synergy matrix
`B` (see the in-app "How to play" section for every synergy percentage),
then rescaled by the build's own overall size (`‖x‖2`, its length as a
vector). Total damage output is `1^T G_t(x)` — the effective element
powers summed.

**Why divide by `‖x‖2`?** An earlier version used the raw, unnormalized
`B^t · x` for both the bars and the total. That total is genuinely
*linear* in the allocation once `t` is fixed at `TOTAL_POINTS` — and a
linear function over the feasible region (points ≥ 0, summing to
`TOTAL_POINTS`, i.e. a simplex) is always maximized at a **vertex** of
that simplex, meaning dumping every point into a single attribute. That's
an artifact of it being an unconstrained linear program; it has nothing
to do with `v1` in general, and in practice the single best attribute
(Fire) beat a build shaped like `v1` by a wide margin. Dividing by `‖x‖2`
makes the metric depend only on `x`'s *direction*, not its magnitude — a
scale-invariant, Rayleigh-quotient-style ratio that, by the
Cauchy-Schwarz inequality, is maximized when `x` points the same way as
`v1`, not by concentrating mass in one coordinate. That's what makes
"build toward the dominant eigenvector" the actual best strategy, matching
the point of the exercise.

The right-hand "Damage output" chart plots, against points spent (`t`,
from 0 to 50):

- **your output** (teal dot) — the player's real, allocation-dependent
  total, `1^T G_t(x)`, at the current build. It's a single marker, not a
  trail — it moves right/up as points are added and left/down as they're
  removed, and never leaves a tangle behind when you switch strategies.
- **theoretical max** (gold, dashed curve) — a fixed benchmark, independent
  of the player's build: this same formula evaluated *at `x = v1` exactly*.
  Because `v1` is an eigenvector of `B`, `B^t · v1 = λ1^t · v1` **exactly**
  for every `t` — no dropped modes, no approximation:

```
D_t = 1^T G_t(v1) = λ1^t · (1^T v1)          (‖v1‖2 = 1, already unit-norm)
D_max = D_50 = 1.06^50 · (1^T v1) ≈ 40.87
```

Unlike the earlier (unnormalized) version of this benchmark, a real build
can only get *negligibly* close to beating it now: by Cauchy-Schwarz, the
true maximum of `1^T G_t(x)` over every possible direction is
`‖B^t · 1‖2`, achieved when `x` is proportional to `B^t · 1` — and at
`t = 50` that direction has cosine similarity `> 0.999` with `v1`, so the
gap is under `0.03%` (verified numerically: `‖B^50 · 1‖2 ≈ 40.880` vs.
`D_max ≈ 40.870`). Concretely, dumping all 50 points into Fire (previously
the best strategy) now only reaches `≈ 22.33` — under 55% of `D_max` —
while an allocation shaped like `v1` (Fire+12, Water+9, Earth+8, Wind+10,
Physical+11) reaches `≈ 40.87`, over 99.99% of the theoretical max.

The chart's y-axis is fixed once at the start of each game (`D_max × 1.08`)
and never rescales afterward, so the benchmark curve and the player's
marker always share one stable frame.

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

(Fire has the largest single component, but under the normalized damage
formula above, the best strategy is no longer "dump everything into Fire"
— it's building an allocation *shaped like* `v1` across all five
attributes. See "How it works" above for the numbers.)

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
self-decay (shown in-app only as the "Hint" formula now, not a separate
list — see the in-app "How to play" section).

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
