/**
 * app.js — Eigen-Quest game logic.
 *
 * Everything here runs client-side: no backend, no login. The only math
 * happening live in the browser is a 5x5 matrix-vector multiply each turn
 * (D_{t+1} = B*D_t + u_t) — see levels.js for where the fixed matrix and
 * the theoretical-max constant came from.
 *
 * Score logging: this is a static site with no server, so "uploading a
 * score" means saving it to this browser's own localStorage and offering
 * a CSV download — there is no central collection across students/devices
 * yet. See README.md for how to add that if it's wanted later.
 */

(function () {
  "use strict";

  const SCORE_LOG_KEY = "eigenQuestScoreLog";

  // ---------- small linear algebra helpers ----------

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

  // ---------- state ----------

  const state = {
    playerName: "Player",
    turn: 0,
    D: [],
    history: [], // { turn, D, total }
    choiceCounts: {},
    ended: false,
  };

  // ---------- screen management ----------

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((el) => {
      el.classList.toggle("active", el.id === id);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------- welcome screen ----------

  function startGame() {
    const nameInput = document.getElementById("player-name-input");
    const typed = (nameInput.value || "").trim();
    state.playerName = typed || "Player";

    state.turn = 0;
    state.D = LEVEL.D0.slice();
    state.history = [{ turn: 0, D: state.D.slice(), total: sum(state.D) }];
    state.choiceCounts = {};
    LEVEL.labels.forEach((l) => (state.choiceCounts[l] = 0));
    state.ended = false;

    document.getElementById("play-level-name").textContent = LEVEL.name;
    document.getElementById("theoretical-max-value").textContent = LEVEL.theoreticalMax.toFixed(2);
    document.getElementById("max-turns-value").textContent = LEVEL.maxTurns;

    resetEndgamePanel();
    buildLevelUpButtons();
    buildSynergyList();
    renderPlayScreen();
    showScreen("screen-play");
  }

  function resetEndgamePanel() {
    document.getElementById("endgame-panel").classList.add("hidden");
    document.getElementById("endgame-prompt").classList.remove("hidden");
    document.getElementById("endgame-result").classList.add("hidden");
    document.getElementById("endgame-result").innerHTML = "";
    document.getElementById("play-again-btn").classList.add("hidden");
    document.querySelectorAll(".levelup-btn").forEach((b) => (b.disabled = false));
  }

  // ---------- play screen ----------

  function buildLevelUpButtons() {
    const wrap = document.getElementById("levelup-buttons");
    wrap.innerHTML = "";
    LEVEL.labels.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.className = "levelup-btn";
      btn.style.setProperty("--type-color", LEVEL.colors[label]);
      btn.innerHTML = `<span class="dot"></span>${label}`;
      btn.addEventListener("click", () => levelUp(i));
      wrap.appendChild(btn);
    });
  }

  function levelUp(typeIndex) {
    if (state.turn >= LEVEL.maxTurns) return;

    const label = LEVEL.labels[typeIndex];
    const u = oneHot(LEVEL.labels.length, typeIndex);
    state.D = vecAdd(matVec(LEVEL.B, state.D), u);
    state.turn += 1;
    state.choiceCounts[label] += 1;

    state.history.push({ turn: state.turn, D: state.D.slice(), total: sum(state.D) });

    renderPlayScreen();

    if (state.turn >= LEVEL.maxTurns) {
      document.querySelectorAll(".levelup-btn").forEach((b) => (b.disabled = true));
      endGame();
    }
  }

  function renderPlayScreen() {
    const D = state.D;
    const maxVal = Math.max(...D, 1) * 1.15;

    const barsWrap = document.getElementById("damage-bars");
    barsWrap.innerHTML = "";
    LEVEL.labels.forEach((label, i) => {
      const pct = Math.max(2, (D[i] / maxVal) * 100);
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="bar-label">${label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${LEVEL.colors[label]}"></div>
        </div>
        <div class="bar-value">${D[i].toFixed(2)}</div>
      `;
      barsWrap.appendChild(row);
    });

    document.getElementById("total-damage").textContent = sum(D).toFixed(2);
    document.getElementById("turn-counter").textContent = `Turn ${state.turn} / ${LEVEL.maxTurns}`;

    renderGrowthChart();
  }

  function renderGrowthChart() {
    const svg = document.getElementById("growth-chart");
    const w = 260,
      h = 140,
      pad = 8;
    const yMax = LEVEL.theoreticalMax * 1.08;

    const xAt = (turn) => pad + (turn / LEVEL.maxTurns) * (w - 2 * pad);
    const yAt = (value) => h - pad - (Math.min(value, yMax) / yMax) * (h - 2 * pad);

    // your growing output curve
    const pts = state.history.map((entry) => `${xAt(entry.turn).toFixed(1)},${yAt(entry.total).toFixed(1)}`);
    svg.querySelector("#growth-poly").setAttribute("points", pts.join(" "));

    // fixed vertical reference bar at the right edge: theoretical max for this world
    const xRef = xAt(LEVEL.maxTurns);
    const line = svg.querySelector("#max-ref-line");
    line.setAttribute("x1", xRef.toFixed(1));
    line.setAttribute("x2", xRef.toFixed(1));
    line.setAttribute("y1", yAt(0).toFixed(1));
    line.setAttribute("y2", yAt(LEVEL.theoreticalMax).toFixed(1));
  }

  // ---------- how to play / synergy list ----------

  function buildSynergyList() {
    const wrap = document.getElementById("synergy-list");
    wrap.innerHTML = "";
    const n = LEVEL.labels.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = LEVEL.B[i][j];
        if (a > 0) {
          const item = document.createElement("div");
          item.className = "synergy-item";
          item.innerHTML = `<span class="dot" style="background:${LEVEL.colors[LEVEL.labels[j]]}"></span>${LEVEL.labels[j]} → ${LEVEL.labels[i]}: ${(a * 100).toFixed(0)}%`;
          wrap.appendChild(item);
        }
      }
    }
  }

  // ---------- end of game / score upload ----------

  function endGame() {
    state.ended = true;
    const finalScore = sum(state.D);
    document.getElementById("endgame-score").textContent = finalScore.toFixed(2);
    document.getElementById("endgame-panel").classList.remove("hidden");
  }

  function saveScoreRecord() {
    const record = {
      name: state.playerName,
      score: Number(sum(state.D).toFixed(2)),
      turns: LEVEL.maxTurns,
      selections: { ...state.choiceCounts },
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
      // localStorage unavailable (private browsing, quota, etc.) — degrade quietly
    }
    return { record, count: log.length };
  }

  function downloadScoreLogCsv() {
    let log = [];
    try {
      log = JSON.parse(localStorage.getItem(SCORE_LOG_KEY) || "[]");
    } catch (e) {
      log = [];
    }
    if (log.length === 0) return;

    const labelCols = LEVEL.labels;
    const header = ["name", "score", "turns", ...labelCols, "timestamp"];
    const rows = log.map((r) =>
      [
        JSON.stringify(r.name || ""),
        r.score,
        r.turns,
        ...labelCols.map((l) => (r.selections && r.selections[l]) || 0),
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

  function handleScoreChoice(uploaded) {
    document.getElementById("endgame-prompt").classList.add("hidden");
    const resultEl = document.getElementById("endgame-result");
    resultEl.classList.remove("hidden");

    if (uploaded) {
      const { count } = saveScoreRecord();
      resultEl.innerHTML = `
        <p>Saved to this browser's local score log (${count} entr${count === 1 ? "y" : "ies"} so far).</p>
        <button id="download-log-btn" class="btn btn-secondary">Download score log (CSV)</button>
      `;
      document.getElementById("download-log-btn").addEventListener("click", downloadScoreLogCsv);
    } else {
      resultEl.innerHTML = `<p>No problem — your score wasn't saved.</p>`;
    }

    document.getElementById("play-again-btn").classList.remove("hidden");
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

    document.getElementById("score-yes-btn").addEventListener("click", () => handleScoreChoice(true));
    document.getElementById("score-no-btn").addEventListener("click", () => handleScoreChoice(false));

    document.getElementById("play-again-btn").addEventListener("click", startGame);

    document.getElementById("title-link").addEventListener("click", (e) => {
      e.preventDefault();
      showScreen("screen-title");
    });
  });
})();
