/**
 * app.js — Eigen-Quest game logic.
 *
 * Everything here runs client-side, no backend, no login, no tracking.
 * The only "linear algebra" happening live in the browser is a 5x5
 * matrix-vector multiply each turn (D_{t+1} = B*D_t + u_t) and a cosine
 * similarity against a precomputed target direction — see levels.js for
 * where the actual eigenvalues/eigenvectors came from.
 */

(function () {
  "use strict";

  // ---------- small linear algebra helpers ----------

  function matVec(B, v) {
    const n = v.length;
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += B[i][j] * v[j];
      out[i] = sum;
    }
    return out;
  }

  function vecAdd(a, b) {
    return a.map((x, i) => x + b[i]);
  }

  function oneHot(n, i) {
    const out = new Array(n).fill(0);
    out[i] = 1;
    return out;
  }

  function sum(v) {
    return v.reduce((a, b) => a + b, 0);
  }

  function norm(v) {
    return Math.sqrt(v.reduce((a, b) => a + b * b, 0));
  }

  function cosSim(a, b) {
    const na = norm(a),
      nb = norm(b);
    if (na === 0 || nb === 0) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot / (na * nb);
  }

  function normalizeSum1(v) {
    const s = sum(v);
    if (s === 0) return v.map(() => 0);
    return v.map((x) => x / s);
  }

  // ---------- state ----------

  const state = {
    levelIndex: null,
    level: null,
    turn: 0,
    D: [],
    history: [], // { turn, D, cosSim, total }
  };

  // ---------- screen management ----------

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((el) => {
      el.classList.toggle("active", el.id === id);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------- title / level select ----------

  function renderLevelSelect() {
    const wrap = document.getElementById("level-list");
    wrap.innerHTML = "";
    LEVELS.forEach((level, idx) => {
      const card = document.createElement("button");
      card.className = "level-card";
      card.innerHTML = `
        <div class="level-card-name">${level.name}</div>
        <div class="level-card-sub">${level.subtitle}</div>
        <div class="level-card-meta">
          <span>${level.labels.length} damage types</span>
          <span>${level.maxTurns} turns</span>
        </div>
      `;
      card.addEventListener("click", () => startLevel(idx));
      wrap.appendChild(card);
    });
  }

  // ---------- play screen ----------

  function startLevel(idx) {
    state.levelIndex = idx;
    state.level = LEVELS[idx];
    state.turn = 0;
    state.D = state.level.D0.slice();
    state.history = [
      {
        turn: 0,
        D: state.D.slice(),
        cosSim: cosSim(state.D, state.level.vMax),
        total: sum(state.D),
      },
    ];

    document.getElementById("play-level-name").textContent = state.level.name;
    buildLevelUpButtons();
    renderPlayScreen();
    showScreen("screen-play");
  }

  function buildLevelUpButtons() {
    const wrap = document.getElementById("levelup-buttons");
    wrap.innerHTML = "";
    state.level.labels.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "levelup-btn";
      btn.style.setProperty("--type-color", state.level.colors[label]);
      btn.innerHTML = `<span class="dot"></span>${label}`;
      btn.addEventListener("click", () => levelUp(i));
      wrap.appendChild(btn);
    });
  }

  function levelUp(typeIndex) {
    const level = state.level;
    if (state.turn >= level.maxTurns) return;

    const u = oneHot(level.labels.length, typeIndex);
    state.D = vecAdd(matVec(level.B, state.D), u);
    state.turn += 1;

    state.history.push({
      turn: state.turn,
      D: state.D.slice(),
      cosSim: cosSim(state.D, level.vMax),
      total: sum(state.D),
    });

    renderPlayScreen();

    if (state.turn >= level.maxTurns) {
      document.getElementById("end-level-btn").classList.remove("hidden");
      document.querySelectorAll(".levelup-btn").forEach((b) => (b.disabled = true));
    }
  }

  function renderPlayScreen() {
    const level = state.level;
    const D = state.D;
    const maxVal = Math.max(...D, 1) * 1.15;

    // damage bars
    const barsWrap = document.getElementById("damage-bars");
    barsWrap.innerHTML = "";
    level.labels.forEach((label, i) => {
      const pct = Math.max(2, (D[i] / maxVal) * 100);
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="bar-label">${label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${level.colors[label]}"></div>
        </div>
        <div class="bar-value">${D[i].toFixed(2)}</div>
      `;
      barsWrap.appendChild(row);
    });

    // total damage + turn counter
    document.getElementById("total-damage").textContent = sum(D).toFixed(2);
    document.getElementById("turn-counter").textContent = `Turn ${state.turn} / ${level.maxTurns}`;

    // alignment meter
    const latest = state.history[state.history.length - 1];
    const alignPct = Math.max(0, latest.cosSim) * 100;
    document.getElementById("alignment-fill").style.width = alignPct.toFixed(1) + "%";
    document.getElementById("alignment-value").textContent = alignPct.toFixed(1) + "%";

    renderSparkline();
  }

  function renderSparkline() {
    const svg = document.getElementById("sparkline");
    const w = 260,
      h = 60,
      pad = 4;
    const pts = state.history.map((h_, i) => {
      const x = pad + (i / Math.max(1, state.level.maxTurns)) * (w - 2 * pad);
      const y = h - pad - Math.max(0, h_.cosSim) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const poly = svg.querySelector("polyline");
    poly.setAttribute("points", pts.join(" "));
  }

  // ---------- debrief screen ----------

  function showDebrief() {
    const level = state.level;
    const finalD = state.D;
    const finalProportions = normalizeSum1(finalD);
    const finalCos = cosSim(finalD, level.vMax);
    const growthPct = (level.lambdaMax - 1) * 100;

    document.getElementById("debrief-level-name").textContent = level.name;
    document.getElementById("debrief-text").textContent = level.debrief;
    document.getElementById("debrief-growth").textContent = `+${growthPct.toFixed(2)}% / turn`;
    document.getElementById("debrief-alignment").textContent = `${(finalCos * 100).toFixed(1)}%`;
    document.getElementById("debrief-ratio").textContent = level.lambda2Ratio.toFixed(3);

    const compareWrap = document.getElementById("debrief-compare");
    compareWrap.innerHTML = "";
    level.labels.forEach((label, i) => {
      const yourPct = finalProportions[i] * 100;
      const targetPct = level.vMax[i] * 100;
      const row = document.createElement("div");
      row.className = "compare-row";
      row.innerHTML = `
        <div class="compare-label">${label}</div>
        <div class="compare-track">
          <div class="compare-target" style="width:${targetPct}%"></div>
          <div class="compare-yours" style="width:${yourPct}%;background:${level.colors[label]}"></div>
        </div>
        <div class="compare-values">
          <span>you: ${yourPct.toFixed(1)}%</span>
          <span>settles at: ${targetPct.toFixed(1)}%</span>
        </div>
      `;
      compareWrap.appendChild(row);
    });

    buildCheckQuestions();
    showScreen("screen-debrief");
  }

  // ---------- comprehension check ----------

  const QUESTIONS = [
    {
      q: "Suppose two players play the same world, one always leveling up the same damage type and the other rotating through all of them evenly. After many turns, their total damage will be...",
      options: [
        "About the same — both converge to the same dominant direction",
        "Very different — the focused build always wins big",
        "Very different — the balanced build always wins big",
      ],
      correct: 0,
      explain:
        "Both trajectories are eventually dominated by the same eigenvector, so their long-run growth rate and shape converge regardless of strategy — that's the whole theorem this game is built around.",
    },
    {
      q: "What mainly controls how many turns it takes for a build to visibly “lock in” to its final shape?",
      options: [
        "Which damage type you pick first",
        "The gap between the top two eigenvalues of B",
        "The total number of damage types in the game",
      ],
      correct: 1,
      explain:
        "A bigger gap between λ₁ and λ₂ means the second-strongest mode decays away faster — that's why Trial of Convergence (ratio ≈ 0.94) settled in noticeably faster than The Analyst's Build (ratio ≈ 0.96).",
    },
  ];

  function buildCheckQuestions() {
    const wrap = document.getElementById("check-questions");
    wrap.innerHTML = "";
    QUESTIONS.forEach((item, qi) => {
      const block = document.createElement("div");
      block.className = "check-block";
      const optionsHtml = item.options
        .map(
          (opt, oi) =>
            `<button class="check-option" data-q="${qi}" data-o="${oi}">${opt}</button>`
        )
        .join("");
      block.innerHTML = `
        <div class="check-question">${item.q}</div>
        <div class="check-options">${optionsHtml}</div>
        <div class="check-feedback" id="check-feedback-${qi}"></div>
      `;
      wrap.appendChild(block);
    });

    wrap.querySelectorAll(".check-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const qi = Number(btn.dataset.q);
        const oi = Number(btn.dataset.o);
        const item = QUESTIONS[qi];
        const feedback = document.getElementById(`check-feedback-${qi}`);
        const optionButtons = wrap.querySelectorAll(`.check-option[data-q="${qi}"]`);
        optionButtons.forEach((b) => (b.disabled = true));
        btn.classList.add(oi === item.correct ? "correct" : "incorrect");
        if (oi !== item.correct) {
          optionButtons[item.correct].classList.add("correct");
        }
        feedback.textContent = (oi === item.correct ? "Correct — " : "Not quite — ") + item.explain;
        feedback.classList.add("visible");
      });
    });
  }

  // ---------- wiring ----------

  document.addEventListener("DOMContentLoaded", () => {
    renderLevelSelect();

    document.getElementById("begin-btn").addEventListener("click", () => {
      showScreen("screen-select");
    });

    document.getElementById("end-level-btn").addEventListener("click", showDebrief);

    document.getElementById("play-again-btn").addEventListener("click", () => {
      startLevel(state.levelIndex);
    });

    document.getElementById("choose-world-btn").addEventListener("click", () => {
      showScreen("screen-select");
    });

    document.getElementById("title-link").addEventListener("click", (e) => {
      e.preventDefault();
      showScreen("screen-title");
    });
  });
})();
