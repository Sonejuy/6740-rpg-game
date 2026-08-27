# Eigen-Quest

A small browser game built on the "Damage Synergy System" example from the
OMS 6740 linear algebra review. Players level up one damage type per turn
and try to maximize total damage output — the deeper linear-algebra story
(why builds converge, eigenvalues/eigenvectors) is left for course
discussion elsewhere; this app is deliberately just the game.

**Play it:** open `index.html` in a browser, or visit the GitHub Pages URL
once Pages is enabled for this repo (see below). No install, no login, no
backend.

## How it works

Each level-up choice runs:

```
D_{t+1} = B · D_t + u_t
```

where `D_t` is the 5-dimensional damage-type vector, `B = I + A` is the
fixed synergy matrix (see the in-app "How to play" section for every
synergy percentage), and `u_t` is the player's one-hot level-up choice.
There are 20 turns; the right-hand chart plots total damage output turn by
turn against a dashed reference line marking the **theoretical maximum** —
the best total damage achievable by any sequence of choices for this exact
matrix and turn count (see "How the theoretical max is computed" below).

## Project structure

- `index.html` — page structure (title screen, welcome/name-entry screen, play screen)
- `style.css` — all styling
- `levels.js` — the fixed synergy matrix, starting state, turn count, and precomputed theoretical max
- `app.js` — game logic: matrix-vector multiply, the damage-over-time chart, the how-to-play synergy list, and score logging

No build step, no dependencies — plain HTML/CSS/JS.

## How the theoretical max is computed

It's an exact closed form, not a search or simulation. Since
`D_T = B^T D_0 + sum_{t=0}^{T-1} B^{T-1-t} u_t`, the total damage
`1^T D_T` splits into a fixed baseline plus a sum of independent per-turn
terms — so the optimal `u_t` at each turn just maximizes its own term,
computed with repeated vector-matrix products `1^T B^k`. This was computed
offline in NumPy and hardcoded as `theoreticalMax` in `levels.js`; the
result (178.071089) was cross-checked by simulating the resulting optimal
turn-by-turn choices end to end.

## Score logging — read this before telling students to "upload their score"

This is a static site with **no server**. When a player clicks "Yes" on
"Would you like to upload your score?", the score is saved to that
browser's own `localStorage` and the player can download a CSV of
everything logged in that browser. **There is no central collection across
students or devices** — each student's scores stay on their own machine
unless they manually send you their downloaded CSV.

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
