/**
 * levels.js
 *
 * Precomputed "worlds" for Eigen-Quest.
 *
 * Each world is a fixed, pre-balanced linear dynamical system:
 *   D_{t+1} = B * D_t + u_t
 * where B = I + A is the synergy matrix (A entries in [0,1], row i / col j
 * meaning "damage type j boosts damage type i" — same convention as the
 * OMS 6740 linear algebra review), D_t is the damage-type vector, and u_t
 * is the player's level-up choice (a one-hot vector).
 *
 * lambdaMax and vMax below were computed OFFLINE in NumPy (eigenvalues of
 * B, sorted by magnitude) and are just constants here — the game never
 * solves an eigenproblem in the browser. vMax is normalized to sum to 1,
 * i.e. it's the long-run *proportion* of total damage each type settles
 * into; that normalization doesn't change cosine similarity, so it's used
 * directly as the "target direction" for the alignment meter.
 */

const LABELS = ["Fire", "Water", "Earth", "Wind", "Physical"];

const COLORS = {
  Fire: "#e2572b",
  Water: "#2b8ce2",
  Earth: "#8a6b3d",
  Wind: "#3fc1c9",
  Physical: "#9aa5b1",
};

const LEVELS = [
  {
    id: "trial-1",
    name: "Trial of Convergence",
    subtitle: "One force pulls hardest here. Watch it take over fast.",
    labels: LABELS,
    colors: COLORS,
    D0: [10, 10, 10, 10, 10],
    B: [
      [1.00, 0.02, 0.00, 0.00, 0.00],
      [0.00, 1.00, 0.02, 0.00, 0.00],
      [0.00, 0.00, 1.00, 0.02, 0.00],
      [0.00, 0.00, 0.00, 1.00, 0.02],
      [0.18, 0.16, 0.14, 0.12, 1.00],
    ],
    lambdaMax: 1.061439,
    lambda2Ratio: 0.942771, // |lambda_2 / lambda_1|
    vMax: [0.007601, 0.023351, 0.071734, 0.220364, 0.676948],
    maxTurns: 15,
    debrief:
      "Physical dominates the long run here — every other type ultimately just feeds it. " +
      "Notice how fast your build's shape locked in: with the top eigenvalue clearly ahead " +
      "of the rest, alignment climbed past 90% in only a handful of turns.",
  },
  {
    id: "trial-2",
    name: "The Analyst's Build",
    subtitle:
      "The original 6740 case study: five elements, tangled interactions, a much closer race at the top.",
    labels: LABELS,
    colors: COLORS,
    D0: [10, 8, 6, 7, 9],
    B: [
      [1.00, 0.00, 0.01, 0.06, 0.03],
      [0.00, 1.00, 0.00, 0.00, 0.01],
      [0.00, 0.05, 1.00, 0.00, 0.00],
      [0.04, 0.02, 0.01, 1.00, 0.00],
      [0.02, 0.00, 0.06, 0.02, 1.00],
    ],
    lambdaMax: 1.061582,
    lambda2Ratio: 0.962322,
    vMax: [0.397686, 0.040823, 0.033145, 0.276952, 0.251395],
    maxTurns: 20,
    debrief:
      "This is the exact synergy matrix from the slides. The top two eigenvalues are much " +
      "closer together than in Trial 1 (ratio ≈ 0.96 vs ≈ 0.94), which is exactly why " +
      "convergence felt slower and less certain — the second-strongest mode fades out much " +
      "more gradually. Given enough turns, though, the outcome is just as inevitable.",
  },
];

if (typeof module !== "undefined") {
  module.exports = { LABELS, COLORS, LEVELS };
}
