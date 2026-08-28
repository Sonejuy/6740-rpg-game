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
  const HISTORY_CAP = 400;

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
    history: [], // [{ t, damage }] chronological trace, can move forward or backward
    chartCeiling: 1, // fixed y-axis scale for the session, set in startGame()
  };

  function currentX0() {
    return BASE.map((b, i) => b + state.allocation[i]);
  }

  function currentT() {
    return sum(state.allocation);
  }

  function theoreticalMax(x0) {
    const c1 = dot(V1, x0);
    return c1 * Math.pow(LAMBDA1, TOTAL_POINTS) * sum(V1);
  }

  // theoreticalMax(x0) is linear in x0, maximized over the feasible
  // allocation simplex at a vertex — i.e. by putting all TOTAL_POINTS into
  // whichever single attribute has the largest V1 component. Used only to
  // fix the chart's y-axis so the curve visibly rises AND falls as points
  // are added/removed, instead of the axis silently rescaling every click.
  function maxPossibleTheoreticalMax() {
    let best = 0;
    for (let i = 0; i < LABELS.length; i++) {
      const x0 = BASE.slice();
      x0[i] += TOTAL_POINTS;
      best = Math.max(best, theoreticalMax(x0));
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
    state.history = [{ t: 0, damage: sum(BASE) }];
    state.chartCeiling = maxPossibleTheoreticalMax();

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
        <span class="alloc-count" id="alloc-count-${i}">0</span>
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

    const x0 = currentX0();
    const t = currentT();
    const effective = applyPower(x0, t);
    state.history.push({ t, damage: sum(effective) });
    if (state.history.length > HISTORY_CAP) {
      state.history = state.history.slice(state.history.length - HISTORY_CAP);
    }

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
      document.getElementById(`alloc-count-${i}`).textContent = state.allocation[i];
    });
    document.querySelectorAll(".alloc-up").forEach((btn) => (btn.disabled = remaining <= 0));
    document.querySelectorAll(".alloc-down").forEach((btn) => {
      btn.disabled = state.allocation[Number(btn.dataset.i)] <= 0;
    });

    renderGrowthChart(x0);
  }

  function renderGrowthChart(x0) {
    const svg = document.getElementById("growth-chart");
    const w = 260,
      h = 140,
      pad = 8;

    const refValue = theoreticalMax(x0);
    // Fixed for the whole session (see maxPossibleTheoreticalMax) so the
    // curve visibly rises AND falls as points are added/removed, instead of
    // the axis silently rescaling — and clamped so a stray value beyond the
    // ceiling (the asymptotic formula is an approximation, see levels.js)
    // still fits rather than getting cut off.
    const yMax = Math.max(state.chartCeiling, refValue, ...state.history.map((e) => e.damage)) * 1.02;

    const xAt = (t) => pad + (t / TOTAL_POINTS) * (w - 2 * pad);
    const yAt = (value) => h - pad - (Math.max(0, Math.min(value, yMax)) / yMax) * (h - 2 * pad);

    const pts = state.history.map((e) => `${xAt(e.t).toFixed(1)},${yAt(e.damage).toFixed(1)}`);
    svg.querySelector("#growth-poly").setAttribute("points", pts.join(" "));

    const xRef = xAt(TOTAL_POINTS);
    const line = svg.querySelector("#max-ref-line");
    line.setAttribute("x1", xRef.toFixed(1));
    line.setAttribute("x2", xRef.toFixed(1));
    line.setAttribute("y1", yAt(0).toFixed(1));
    line.setAttribute("y2", yAt(refValue).toFixed(1));

    document.getElementById("theoretical-max-value").textContent = refValue.toFixed(2);
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
