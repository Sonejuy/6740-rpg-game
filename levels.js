/**
 * levels.js
 *
 * The one "world" Eigen-Quest plays out on: a fixed, pre-balanced linear
 * dynamical system —
 *
 *   D_{t+1} = B * D_t + u_t
 *
 * where B = I + A is the synergy matrix (A[i][j] = the fractional boost
 * damage type j gives damage type i, per turn), D_t is the damage-type
 * vector, and u_t is the player's level-up choice (a one-hot vector).
 *
 * This is the exact matrix and starting state from the OMS 6740 linear
 * algebra review's worked example.
 *
 * `theoreticalMax` is the best total damage achievable after `maxTurns`
 * turns under ANY sequence of level-up choices — computed once, offline.
 * It has a closed form here because each turn's contribution to the final
 * total is independent of every other turn's choice:
 *
 *   1^T D_T = 1^T B^T D0 + sum_{t=0}^{T-1} (1^T B^{T-1-t}) . u_t
 *
 * so the optimal u_t just maximizes its own term — no simulation or search
 * needed. (Verified two ways: this closed form, and simulating the
 * resulting optimal per-turn choices end to end — both give 178.071089.)
 */

const LABELS = ["Fire", "Water", "Earth", "Wind", "Physical"];

const COLORS = {
  Fire: "#e2572b",
  Water: "#2b8ce2",
  Earth: "#8a6b3d",
  Wind: "#3fc1c9",
  Physical: "#9aa5b1",
};

const LEVEL = {
  name: "Maximize your damage output",
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
  maxTurns: 20,
  theoreticalMax: 178.071089,
};

if (typeof module !== "undefined") {
  module.exports = { LABELS, COLORS, LEVEL };
}
