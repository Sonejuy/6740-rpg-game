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
 *   - The displayed "Effective Element Power" is the NORMALIZED synergy
 *     transform:
 *         G_t(x0) = (B^t * x0) / ||x0||_2
 *     — the raw allocation run through t rounds of the fixed synergy
 *     interaction, then rescaled by the build's own overall size. Total
 *     damage output = 1^T G_t(x0) (the bars summed).
 *
 *     Why divide by ||x0||_2? An earlier version used the raw (unnormalized)
 *     B^t * x0 as both the bars AND the total. That total is a genuinely
 *     LINEAR function of the allocation once t is fixed at TOTAL_POINTS, and
 *     a linear function over the feasible region (points >= 0, summing to
 *     TOTAL_POINTS — a simplex) is always maximized at a VERTEX of that
 *     simplex — i.e. by dumping every point into a single attribute. That's
 *     an artifact of it being an unconstrained linear-programming problem;
 *     it has nothing to do with v1 in general, and indeed the single best
 *     attribute (Fire) beat the "build toward v1" strategy by a wide margin.
 *     Dividing by ||x0||_2 makes the metric depend only on x0's DIRECTION,
 *     not its magnitude (a scale-invariant / Rayleigh-quotient-style ratio)
 *     — which by the Cauchy-Schwarz inequality is maximized when x0 points
 *     the same way as v1, not by concentrating mass in one coordinate. This
 *     is what makes "build toward the dominant eigenvector" the actual best
 *     strategy, matching the pedagogical point of the exercise. See
 *     README.md for the numbers confirming this (v1-aligned builds now
 *     roughly double what any single-attribute dump achieves).
 *   - The dashed "theoretical" curve (app.js: theoreticalD(t)) evaluates
 *     this same formula AT x = v1 exactly. Because v1 is an eigenvector,
 *     B^t * v1 = lambda1^t * v1 exactly for any t — no approximation, no
 *     dropped modes — so D_t = lambda1^t * (1^T v1) is an exact benchmark,
 *     not an asymptotic one. "D_max" is this curve's value at
 *     t = TOTAL_POINTS. A real build can get arbitrarily close to it (an
 *     allocation shaped like v1, e.g. Fire+12/Water+9/Earth+8/Wind+10/
 *     Physical+11, reaches over 99.99% of D_max) but — again by
 *     Cauchy-Schwarz — can only exceed it by a truly negligible amount
 *     (under 0.03% at t=50, see README.md), unlike the old formula's
 *     double-digit-percent overshoots.
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
