/**
 * app.js — Eigen-Quest build-simulator logic.
 *
 * No turns, no ending: the player freely distributes up to TOTAL_POINTS
 * points across 5 attributes, can add/remove anytime, and can submit
 * their current score whenever they like. Everything is client-side —
 * "submitting a score" saves it to this browser's own localStorage plus
 * a CSV download (see README.md for why, and what central collection
 * across students would need).
 */

(function () {
  "use strict";

  const SCORE_LOG_KEY = "eigenQuestScoreLog";

  // ---------- linear algebra helpers ----------

  function matVec(B, v) {
    const n = v.length;
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += B[i][j] * v[j];
      out[i] = s;
    }
    return out;
  }

  function applyPower(x0, t) {
    let x = x0.slice();
    for (let k = 0; k < t; k++) x = matVec(B, x);
    return x;
  }

  function sum(v) {
    return v.reduce((a, b) => a + b, 0);
  }

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  // ---------- state ----------

  const state = {
    playerName: "Player",
    allocation: [0, 0, 0, 0, 0],
    chartCeiling: 1, // fixed y-axis scale for the whole session, set once in startGame()
  };

  function currentX0() {
    return BASE.map((b, i) => b + state.allocation[i]);
  }

  function currentT() {
    return sum(state.allocation);
  }

  // Theoretical (idealized) growth curve, dominant-mode only:
  //   D_t = c_t * lambda1^t * v1,   c_t = (1^T x0 + t) / (1^T v1)
  // x0 here is the FIXED starting vector BASE = (1,1,1,1,1) — NOT the
  // player's current allocation — and t ranges over [0, TOTAL_POINTS]. This
  // represents "if every point spent so far had been funneled optimally
  // along the dominant growth direction," independent of which attribute
  // the player actually chose — a benchmark curve to compare the real
  // build against, not a tracking of the real build itself. (1^T v1) cancels
  // algebraically, so the scalar total simplifies to (1^T x0 + t) * lambda1^t,
  // but it's computed via the literal formula below for traceability.
  function theoreticalD(t) {
    const c_t = (sum(BASE) + t) / sum(V1);
    return c_t * Math.pow(LAMBDA1, t) * sum(V1);
  }

  // D_max = theoreticalD(TOTAL_POINTS) — the curve's value at full spend.
  // Since BASE, B, and TOTAL_POINTS are all fixed, this is a single
  // constant, not a per-build number that moves as the player reallocates.
  const DMAX = theoreticalD(TOTAL_POINTS);

  // Exact (not approximated) best-case total damage actually reachable by
  // t=TOTAL_POINTS, found by dumping all points into whichever single
  // attribute maximizes the real B^t computation. Used only to size the
  // chart's y-axis so it's a fixed, properly-calibrated scale for the whole
  // session — real achieved values can occasionally land a little above
  // DMAX (see the "How it works" note in README.md on why), so the axis
  // needs to be sized off the true max, not the approximation.
  function trueMaxAchievable() {
    let best = 0;
    for (let i = 0; i < LABELS.length; i++) {
      const x0 = BASE.slice();
      x0[i] += TOTAL_POINTS;
      best = Math.max(best, sum(applyPower(x0, TOTAL_POINTS)));
    }
    return best;
  }

  // ---------- screen management ----------

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((el) => {
      el.classList.toggle("active", el.id === id);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------- game start ----------

  function startGame() {
    const nameInput = document.getElementById("player-name-input");
    const typed = (nameInput.value || "").trim();
    state.playerName = typed || "Player";

    state.allocation = [0, 0, 0, 0, 0];
    // Fixed once for the whole session — never recomputed, never shrinks,
    // never grows. Calibrated off the true achievable max (not just DMAX,
    // which real play can slightly exceed — see trueMaxAchievable above),
    // so the scale stays legible for a typical build from the first click
    // to the last, whether that build peaks early or late.
    state.chartCeiling = Math.max(DMAX, trueMaxAchievable()) * 1.06;

    document.getElementById("submit-feedback").innerHTML = "";

    buildAllocRows();
    buildSynergyList();
    renderPlayScreen();
    showScreen("screen-play");
  }

  // ---------- allocation controls ----------

  function buildAllocRows() {
    const wrap = document.getElementById("alloc-rows");
    wrap.innerHTML = "";
    LABELS.forEach((label, i) => {
      const row = document.createElement("div");
      row.className = "alloc-row";
      row.innerHTML = `
        <span class="dot" style="background:${COLORS[label]}"></span>
        <span class="alloc-label">${label}</span>
        <button class="alloc-btn alloc-down" data-i="${i}" aria-label="Decrease ${label}">−</button>
        <span class="alloc-count" id="alloc-count-${i}">${BASE[i]}</span>
        <button class="alloc-btn alloc-up" data-i="${i}" aria-label="Increase ${label}">+</button>
      `;
      wrap.appendChild(row);
    });

    wrap.querySelectorAll(".alloc-up").forEach((btn) => {
      btn.addEventListener("click", () => adjustAllocation(Number(btn.dataset.i), 1));
    });
    wrap.querySelectorAll(".alloc-down").forEach((btn) => {
      btn.addEventListener("click", () => adjustAllocation(Number(btn.dataset.i), -1));
    });
  }

  function adjustAllocation(i, delta) {
    const remaining = TOTAL_POINTS - currentT();
    if (delta > 0 && remaining <= 0) return;
    if (delta < 0 && state.allocation[i] <= 0) return;

    state.allocation[i] += delta;

    renderPlayScreen();
  }

  // ---------- rendering ----------

  function renderPlayScreen() {
    const x0 = currentX0();
    const t = currentT();
    const effective = applyPower(x0, t);
    const total = sum(effective);

    // effective attribute bars
    const maxVal = Math.max(...effective, 1) * 1.15;
    const barsWrap = document.getElementById("damage-bars");
    barsWrap.innerHTML = "";
    LABELS.forEach((label, i) => {
      const pct = Math.max(2, (effective[i] / maxVal) * 100);
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="bar-label">${label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${COLORS[label]}"></div>
        </div>
        <div class="bar-value">${effective[i].toFixed(2)}</div>
      `;
      barsWrap.appendChild(row);
    });

    document.getElementById("total-damage").textContent = total.toFixed(2);

    // allocation controls
    const remaining = TOTAL_POINTS - t;
    document.getElementById("remaining-points").textContent = remaining;
    LABELS.forEach((label, i) => {
      // shows the raw attribute value x0_i = BASE[i] + points spent here,
      // not just points spent — so it never reads below its starting value
      document.getElementById(`alloc-count-${i}`).textContent = BASE[i] + state.allocation[i];
    });
    document.querySelectorAll(".alloc-up").forEach((btn) => (btn.disabled = remaining <= 0));
    document.querySelectorAll(".alloc-down").forEach((btn) => {
      btn.disabled = state.allocation[Number(btn.dataset.i)] <= 0;
    });

    renderGrowthChart(t, total);
  }

  function renderGrowthChart(t, total) {
    const svg = document.getElementById("growth-chart");
    const w = 260,
      h = 140,
      pad = 8;

    // Fixed once at game start (see startGame) and never changed — no
    // rescaling, no ratcheting — so both marks below share one stable frame
    // for the whole session.
    const yMax = state.chartCeiling;

    const xAt = (t) => pad + (t / TOTAL_POINTS) * (w - 2 * pad);
    const yAt = (value) => h - pad - (Math.max(0, Math.min(value, yMax)) / yMax) * (h - 2 * pad);

    // your actual output: a single marker at the CURRENT (points spent,
    // real achieved damage) position — not a trail of every past state.
    // A trailing polyline of full session history used to connect points
    // chronologically even when the player had jumped between very
    // different builds at the same point-total (e.g. "all-in Fire" then
    // "all-in Water" both sit at t=50 but ~200 apart in damage) — plotted
    // as one continuous line, that produced a tangle of crossing segments
    // that looked broken. A single marker always shows exactly where the
    // CURRENT build stands, and still visibly moves right/up when points
    // are added and left/down when removed.
    const marker = svg.querySelector("#growth-poly");
    marker.setAttribute("cx", xAt(t).toFixed(1));
    marker.setAttribute("cy", yAt(total).toFixed(1));

    // theoretical benchmark: the idealized curve theoreticalD(t) for
    // t = 0..TOTAL_POINTS, drawn once per render (cheap — 51 points) but
    // otherwise identical every time, since it doesn't depend on the
    // player's choices at all. It ends exactly at DMAX when t = TOTAL_POINTS.
    const refPts = [];
    for (let tt = 0; tt <= TOTAL_POINTS; tt++) {
      refPts.push(`${xAt(tt).toFixed(1)},${yAt(theoreticalD(tt)).toFixed(1)}`);
    }
    svg.querySelector("#max-ref-line").setAttribute("points", refPts.join(" "));

    document.getElementById("theoretical-max-value").textContent = DMAX.toFixed(2);
  }

  // ---------- how to play / synergy list ----------

  function buildSynergyList() {
    const wrap = document.getElementById("synergy-list");
    wrap.innerHTML = "";
    const n = LABELS.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = B[i][j];
        const item = document.createElement("div");
        item.className = "synergy-item";
        item.innerHTML = `<span class="dot" style="background:${COLORS[LABELS[i]]}"></span>${LABELS[i]} ↔ ${LABELS[j]}: ${(a * 100).toFixed(2)}%`;
        wrap.appendChild(item);
      }
    }

    const selfWrap = document.getElementById("self-effect-list");
    selfWrap.innerHTML = "";
    LABELS.forEach((label, i) => {
      const pct = (B[i][i] - 1) * 100;
      const item = document.createElement("div");
      item.className = "synergy-item";
      item.innerHTML = `<span class="dot" style="background:${COLORS[label]}"></span>${label} (self): ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% / round`;
      selfWrap.appendChild(item);
    });

    document.getElementById("total-points-value").textContent = TOTAL_POINTS;
  }

  // ---------- score submission ----------

  function submitScore() {
    const t = currentT();
    const effective = applyPower(currentX0(), t);
    const record = {
      name: state.playerName,
      score: Number(sum(effective).toFixed(2)),
      pointsAllocated: t,
      allocation: LABELS.reduce((acc, l, i) => ((acc[l] = state.allocation[i]), acc), {}),
      timestamp: new Date().toISOString(),
    };

    let log = [];
    try {
      log = JSON.parse(localStorage.getItem(SCORE_LOG_KEY) || "[]");
    } catch (e) {
      log = [];
    }
    log.push(record);
    try {
      localStorage.setItem(SCORE_LOG_KEY, JSON.stringify(log));
    } catch (e) {
      // localStorage unavailable — degrade quietly
    }

    const feedback = document.getElementById("submit-feedback");
    feedback.innerHTML = `
      <p>Submitted — score ${record.score.toFixed(2)} saved to this browser's local log (${log.length} entr${log.length === 1 ? "y" : "ies"} so far).</p>
      <button id="download-log-btn" class="btn btn-secondary">Download score log (CSV)</button>
    `;
    document.getElementById("download-log-btn").addEventListener("click", downloadScoreLogCsv);
  }

  function downloadScoreLogCsv() {
    let log = [];
    try {
      log = JSON.parse(localStorage.getItem(SCORE_LOG_KEY) || "[]");
    } catch (e) {
      log = [];
    }
    if (log.length === 0) return;

    const header = ["name", "score", "points_allocated", ...LABELS, "timestamp"];
    const rows = log.map((r) =>
      [
        JSON.stringify(r.name || ""),
        r.score,
        r.pointsAllocated,
        ...LABELS.map((l) => (r.allocation && r.allocation[l]) || 0),
        r.timestamp,
      ].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eigen-quest-scores.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- wiring ----------

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("begin-btn").addEventListener("click", () => {
      showScreen("screen-welcome");
    });

    document.getElementById("start-game-btn").addEventListener("click", startGame);

    document.getElementById("player-name-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") startGame();
    });

    document.getElementById("submit-score-btn").addEventListener("click", submitScore);

    document.getElementById("title-link").addEventListener("click", (e) => {
      e.preventDefault();
      showScreen("screen-title");
    });
  });
})();
