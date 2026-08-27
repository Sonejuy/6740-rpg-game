# Eigen-Quest

A small browser game that teaches the linear algebra behind the "Damage
Synergy System" example from the OMS 6740 linear algebra review — matrix
dynamics, eigenvalues/eigenvectors, and dominant-eigenvector convergence —
by having students play it instead of read it.

**Play it:** open `index.html` in a browser, or visit the GitHub Pages URL
once Pages is enabled for this repo (see below). No install, no login, no
backend, no tracking.

## What it teaches

Each level-up choice runs the exact dynamics from the slides:

```
D_{t+1} = B · D_t + u_t
```

where `D_t` is a 5-dimensional damage-type vector, `B = I + A` is a fixed
synergy matrix, and `u_t` is the player's one-hot level-up choice. The game
tracks how closely the (normalized) build aligns with the system's dominant
eigenvector turn by turn — the payoff is watching that alignment climb
toward 100% regardless of what the player picks, which is exactly the
"every build converges to the same dominant direction" result from the
slides.

## Project structure

- `index.html` — page structure / the four screens (title, level select, play, debrief)
- `style.css` — all styling
- `levels.js` — the "worlds": precomputed `B`, `λ_max`, and `v_max` for each level (computed offline in NumPy — see below)
- `app.js` — game logic: matrix-vector multiply, cosine-similarity alignment tracking, screen wiring, comprehension-check questions

There is no build step and no dependencies. Everything is plain HTML/CSS/JS.

## How the level data was computed

`levels.js` embeds precomputed constants rather than solving an eigenproblem
in the browser. For a level's synergy matrix `B`, that means:

```python
import numpy as np
eigvals, eigvecs = np.linalg.eig(B)
order = np.argsort(-np.abs(eigvals))
lambda_max = eigvals[order[0]].real
v_max = eigvecs[:, order[0]].real
v_max = v_max / v_max.sum()  # normalize to proportions
```

`Trial 2: The Analyst's Build` uses the exact matrix and initial state from
the slides' worked numeric example — its regression check (level up Fire
from `D_0 = (10,8,6,7,9)` should give `D_1 = (11.75, 8.09, 6.40, 7.62, 9.70)`,
total `43.56`) matches the slides exactly.

## Deploying with GitHub Pages

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. On GitHub: **Settings → Pages → Source → Deploy from a branch**, pick
   `main` and `/ (root)`, then **Save**.
3. GitHub gives you a URL like `https://<username>.github.io/6740-rpg-game/`.
   Share that link — e.g. in a pinned Ed Discussion post — rather than
   expecting it to embed inline in Ed itself (see the build plan for why).

## Status / next steps

This is the Phase 0–1 MVP: two playable worlds, the core level-up loop, the
convergence visualization, and a debrief with comprehension-check questions.
Ideas for later, not required for launch:

- A sandbox mode where students supply their own small matrix and the game
  computes eigenvalues live (would need a library like math.js).
- More worlds / a wider variety of convergence speeds.
- Optional sound/animation polish.
