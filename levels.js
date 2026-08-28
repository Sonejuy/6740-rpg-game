/**
 * levels.js
 *
 * Eigen-Quest is now a build simulator on a single fixed, symmetric
 * synergy matrix with equally-spaced eigenvalues:
 *
 *   eigenvalues:  1.06, 1.03, 1.00, 0.97, 0.94   (gap = 0.03 throughout)
 *
 * Because B is symmetric, its eigenvectors are exactly orthogonal, which
 * is what makes the "theoretical max" formula below well-defined (it's a
 * clean orthogonal projection, not an approximation of one).
 *
 * Model:
 *   - BASE = (1,1,1,1,1) is the starting attribute vector before any
 *     points are spent.
 *   - The player freely distributes up to TOTAL_POINTS points across the
 *     5 attributes (can add/remove anytime) — call that allocation p.
 *   - x0 = BASE + p is the raw (pre-synergy) attribute vector.
 *   - t = sum(p), the total points currently spent.
 *   - The displayed "Effective Attribute Profile" is x_t = B^t * x0 —
 *     i.e. the raw allocation run through t rounds of the fixed synergy
 *     interaction. Total damage output = 1^T x_t (just the bars summed).
 *   - The dashed "theoretical" curve (app.js: theoreticalD(t)) is a
 *     SEPARATE, idealized benchmark — not a tracking of the player's real
 *     build. It's the slides' own asymptotic approximation (section
 *     2.4-2.5), dominant mode only: D_t ~ c_t * lambda1^t * v1, but with
 *     c_t = (1^T x0 + t) / (1^T v1) where x0 = BASE (fixed) and t ranges
 *     over the whole game (0 to TOTAL_POINTS) — i.e. "if every point spent
 *     so far had been funneled straight along the strongest growth
 *     direction," independent of which attribute the player actually
 *     chose. "D_max" is just this curve's value at t = TOTAL_POINTS, a
 *     single fixed constant. Because it drops the non-dominant eigen-modes,
 *     it's an approximation: with equal eigengaps the other modes haven't
 *     fully decayed away even by t=50, so a real build's actual total
 *     (which DOES pick up some of that non-dominant-mode contribution) can
 *     land a little above this curve. That's expected, not a bug — see
 *     README.md for the exact-vs-approximate comparison.
 */

const LABELS = ["Fire", "Water", "Earth", "Wind", "Physical"];

const COLORS = {
  Fire: "#e2572b",
  Water: "#2b8ce2",
  Earth: "#8a6b3d",
  Wind: "#3fc1c9",
  Physical: "#9aa5b1",
};

const BASE = [1, 1, 1, 1, 1];
const TOTAL_POINTS = 50;

const B = [
  [1.038519, 0.006505, 0.005886, 0.007125, 0.007435],
  [0.006505, 1.011905, 0.010771, 0.013039, 0.013606],
  [0.005886, 0.010771, 0.987133, 0.020740, 0.021642],
  [0.007125, 0.013039, 0.020740, 0.979468, 0.041184],
  [0.007435, 0.013606, 0.021642, 0.041184, 0.982975],
];

// dominant eigenpair of B, computed offline (see comment above)
const LAMBDA1 = 1.06;
const V1 = [0.532888, 0.406914, 0.368169, 0.445675, 0.465056]; // unit norm

if (typeof module !== "undefined") {
  module.exports = { LABELS, COLORS, BASE, TOTAL_POINTS, B, LAMBDA1, V1 };
}
