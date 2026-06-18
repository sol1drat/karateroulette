/* =========================================================
   ui.js — Screen management, rendering, transitions, confetti
   ========================================================= */

const UI = (function () {

  const screens = {
    setup:          document.getElementById('screen-setup'),
    roundIntro:     document.getElementById('screen-round-intro'),
    roulette:       document.getElementById('screen-roulette'),
    perform:        document.getElementById('screen-perform'),
    pass:           document.getElementById('screen-pass'),
    score:          document.getElementById('screen-score'),
    roundResults:   document.getElementById('screen-round-results'),
    final:          document.getElementById('screen-final'),
  };

  let timerInterval = null;
  let timerEnd = 0;
  let timerDuration = 0;

  // ---- Screen switching ----
  function show(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[screenKey].classList.add('is-active');
    // Scroll any internal scroll areas back to top
    screens[screenKey].querySelectorAll('.standings, .combo-moves, .score-categories, .player-list').forEach(el => {
      el.scrollTop = 0;
    });
    // Force roulette redraw if showing roulette
    if (screenKey === 'roulette') {
      setTimeout(() => Roulette.resizeCanvas(), 50);
    }
  }

  // ---- Toast ----
  function toast(message, variant = '') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast is-visible';
    if (variant) el.classList.add('toast--' + variant);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove('is-visible');
    }, 2400);
  }

  // ---- Setup screen: player list ----
  function renderPlayerList() {
    const list = document.getElementById('player-list');
    const empty = document.getElementById('player-empty');
    const count = document.getElementById('player-count');
    const startBtn = document.getElementById('start-game');
    const players = Game.getPlayers();

    list.innerHTML = '';
    count.textContent = `${players.length} added`;

    if (players.length === 0) {
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      players.forEach(p => {
        const li = document.createElement('li');
        li.className = 'player-row';
        li.innerHTML = `
          <div class="player-row__avatar" style="background:${p.color}">${escapeHtml(p.initials)}</div>
          <div class="player-row__name">${escapeHtml(p.name)}</div>
          <button class="player-row__remove" data-remove="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        `;
        list.appendChild(li);
      });
    }

    startBtn.disabled = players.length < 2;
  }

  // ---- Round intro ----
  function renderRoundIntro(round) {
    const r = KarateData.getRound(round);
    document.getElementById('round-eyebrow').textContent = `Round ${round} of 3`;
    document.getElementById('round-title').textContent = r.title;
    document.getElementById('round-moves-num').textContent = r.moves;
    document.getElementById('round-desc').textContent = r.desc;
  }

  // ---- Roulette ----
  function renderRoulette(remainingPerformers) {
    document.getElementById('roulette-round-label').textContent = `Round ${Game.getCurrentRound()}`;
    Roulette.setPlayers(remainingPerformers.map(p => p.name));
    document.getElementById('roulette-status').textContent =
      remainingPerformers.length > 1 ? 'Tap to spin!' : 'One fighter left — spin!';
  }

  // ---- Performance / timer + combo combined ----
  function renderPerform(performer, combo, duration, round) {
    // Header: fighter name + round
    document.getElementById('perform-fighter').textContent = performer.name;
    document.getElementById('perform-round').textContent = `Round ${round}`;

    // Difficulty stars
    const diffEl = document.getElementById('combo-difficulty');
    diffEl.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      const star = document.createElement('span');
      star.textContent = '★';
      star.className = i <= combo.stars ? '' : 'star-off';
      diffEl.appendChild(star);
    }

    // Combo moves
    const movesEl = document.getElementById('perform-moves');
    movesEl.innerHTML = '';
    combo.moves.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="combo-moves__text">
          ${escapeHtml(m.en)}
          <span class="combo-moves__jp">${escapeHtml(m.jp)}</span>
        </div>
      `;
      movesEl.appendChild(li);
    });

    // Timer
    const label = document.getElementById('timer-label');
    const progress = document.getElementById('timer-progress');

    if (duration === 0) {
      // Indefinite
      label.textContent = '∞';
      label.classList.add('is-indefinite');
      progress.style.strokeDashoffset = 0;
      progress.classList.remove('is-warning', 'is-danger');
      stopTimer();
    } else {
      label.classList.remove('is-indefinite');
      timerDuration = duration;
      timerEnd = Date.now() + duration * 1000;
      startTimer();
    }
  }

  function startTimer() {
    stopTimer();
    const label = document.getElementById('timer-label');
    const progress = document.getElementById('timer-progress');
    const circumference = 578; // 2 * pi * 92

    function update() {
      const remaining = Math.max(0, (timerEnd - Date.now()) / 1000);
      const display = Math.ceil(remaining);
      label.textContent = display;
      const frac = remaining / timerDuration;
      progress.style.strokeDashoffset = circumference * (1 - frac);

      progress.classList.remove('is-warning', 'is-danger');
      if (remaining <= 5) {
        progress.classList.add('is-danger');
        if (display !== UI._lastBeep) {
          Audio.countdownBeep();
          if (navigator.vibrate) navigator.vibrate(30);
          UI._lastBeep = display;
        }
      } else if (remaining <= 10) {
        progress.classList.add('is-warning');
        if (display !== UI._lastBeep && display === 10) {
          Audio.timerWarning();
          UI._lastBeep = display;
        }
      }

      if (remaining <= 0) {
        stopTimer();
        Audio.ding();
        if (navigator.vibrate) navigator.vibrate([60, 50, 60]);
        if (UI._onTimerEnd) UI._onTimerEnd();
      }
    }
    update();
    UI._lastBeep = null;
    timerInterval = setInterval(update, 100);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function onTimerEnd(cb) { UI._onTimerEnd = cb; }

  // ---- Pass phone ----
  function renderPass(judge, performer) {
    document.getElementById('pass-judge-name').textContent = judge.name;
    document.getElementById('pass-performer-name').textContent = performer.name;
  }

  // ---- Scoring ----
  function renderScoring(judge, performer) {
    document.getElementById('score-judge-name').textContent = judge.name;
    document.getElementById('score-performer-name').textContent = performer.name;

    const cats = [
      { key: 'accuracy', name: 'Accuracy', desc: 'Did each move hit the right target with proper form?' },
      { key: 'power',    name: 'Power',    desc: 'Was there real force behind every strike?' },
      { key: 'style',    name: 'Style',    desc: 'Crisp, confident, controlled — did it look good?' },
    ];

    const container = document.getElementById('score-categories');
    container.innerHTML = '';
    const values = { accuracy: 0, power: 0, style: 0 };

    cats.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'score-cat';
      card.innerHTML = `
        <div class="score-cat__head">
          <span class="score-cat__name">${cat.name}</span>
          <span class="score-cat__value" data-value="${cat.key}">0</span>
        </div>
        <p class="score-cat__desc">${cat.desc}</p>
        <div class="stars" data-cat="${cat.key}" role="radiogroup" aria-label="${cat.name} rating">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `
            <button class="star" data-val="${n}" role="radio" aria-checked="false" aria-label="${n}">${n}</button>
          `).join('')}
        </div>
      `;
      container.appendChild(card);
    });

    // Wire up star clicks
    container.querySelectorAll('.stars').forEach(group => {
      const cat = group.dataset.cat;
      group.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.val);
          values[cat] = val;
          group.querySelectorAll('.star').forEach(s => {
            const sVal = parseInt(s.dataset.val);
            s.classList.toggle('is-on', sVal <= val);
            s.setAttribute('aria-checked', sVal === val ? 'true' : 'false');
          });
          group.parentElement.querySelector(`[data-value="${cat}"]`).textContent = val;
          Audio.starPop();
          updateSubmitState();
        });
      });
    });

    function updateSubmitState() {
      const allSet = values.accuracy > 0 && values.power > 0 && values.style > 0;
      const btn = document.getElementById('score-submit');
      btn.disabled = !allSet;
    }

    UI._scoreValues = values;
  }

  function getScoreValues() { return UI._scoreValues; }

  // ---- Round results ----
  function renderRoundResults(round, standings, newAchievements) {
    document.getElementById('results-round-label').textContent = `Round ${round} complete`;

    // Achievements unlocked this round
    const achEl = document.getElementById('round-achievements');
    achEl.innerHTML = '';
    if (newAchievements && newAchievements.length) {
      newAchievements.forEach(({ player, achId }) => {
        const ach = KarateData.getAchievement(achId);
        if (!ach) return;
        const el = document.createElement('div');
        el.className = 'achievement';
        el.innerHTML = `${ach.icon} <strong>${escapeHtml(player.name)}</strong> · ${ach.label}`;
        el.title = ach.desc;
        achEl.appendChild(el);
      });
      Audio.achievement();
    }

    const list = document.getElementById('round-standings');
    list.innerHTML = '';
    standings.forEach((row, idx) => {
      const rank = idx + 1;
      const li = document.createElement('li');
      li.className = `standing-row${rank <= 3 ? ` is-${rank}st` : ''}`;
      const rankClass = rank === 1 ? 'is-1st' : rank === 2 ? 'is-2nd' : rank === 3 ? 'is-3rd' : '';
      li.className = `standing-row ${rankClass}`;
      li.innerHTML = `
        <div class="standing-row__rank">${rank}</div>
        <div class="standing-row__avatar" style="background:${row.player.color}">${escapeHtml(row.player.initials)}</div>
        <div class="standing-row__name">${escapeHtml(row.player.name)}</div>
        <div class="standing-row__score">${row.score}</div>
      `;
      list.appendChild(li);
    });

    // Update button text
    const btn = document.getElementById('results-next');
    btn.textContent = round >= 3 ? 'See Final Results' : 'Continue to Next Round';
  }

  // ---- Final scoreboard ----
  function renderFinal(standings, winner, newAchievements) {
    // Winner card
    const belt = KarateData.getBelt(winner.totalScore);
    const title = KarateData.getWinnerTitle(winner.totalScore);

    document.getElementById('winner-name').textContent = winner.name;
    document.getElementById('winner-title').textContent = title;
    document.getElementById('winner-score').textContent = winner.totalScore;

    const beltEl = document.getElementById('winner-belt');
    if (belt.color === '#0a0a0a') {
      // Black belt — gold inner half
      beltEl.style.background = `linear-gradient(90deg, #1a1a1a 0%, #1a1a1a 50%, ${belt.color} 50%, ${belt.color} 100%)`;
      beltEl.style.border = '1px solid #fbbf24';
    } else {
      beltEl.style.background = `linear-gradient(90deg, #1a1a1a 0%, #1a1a1a 50%, ${belt.color} 50%, ${belt.color} 100%)`;
      beltEl.style.border = 'none';
    }

    // Final standings list
    const list = document.getElementById('final-standings');
    list.innerHTML = '';
    standings.forEach((row, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'is-1st' : rank === 2 ? 'is-2nd' : rank === 3 ? 'is-3rd' : '';
      const playerBelt = KarateData.getBelt(row.player.totalScore);
      const li = document.createElement('li');
      li.className = `standing-row ${rankClass}`;
      li.innerHTML = `
        <div class="standing-row__rank">${rank}</div>
        <div class="standing-row__avatar" style="background:${row.player.color}">${escapeHtml(row.player.initials)}</div>
        <div class="standing-row__name">${escapeHtml(row.player.name)}</div>
        <div class="standing-row__belt" style="background:${playerBelt.color}; color:${playerBelt.text}">${playerBelt.short}</div>
        <div class="standing-row__score">${row.player.totalScore}</div>
      `;
      list.appendChild(li);
    });

    // Final achievements
    const achEl = document.getElementById('final-achievements');
    achEl.innerHTML = '';
    if (newAchievements && newAchievements.length) {
      newAchievements.forEach(({ player, achId }) => {
        const ach = KarateData.getAchievement(achId);
        if (!ach) return;
        const el = document.createElement('div');
        el.className = 'achievement';
        el.innerHTML = `${ach.icon} <strong>${escapeHtml(player.name)}</strong> · ${ach.label}`;
        el.title = ach.desc;
        achEl.appendChild(el);
      });
    }
  }

  // ---- Confetti ----
  function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    canvas.classList.add('is-active');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#e11d2e', '#fbbf24', '#ffffff', '#3b82f6', '#10b981', '#a855f7'];
    const particles = [];
    const N = 180;
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        size: 6 + Math.random() * 8,
        color: KarateData.pick(colors),
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
      });
    }

    let frames = 0;
    const maxFrames = 240;

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      frames++;
      if (frames < maxFrames) {
        requestAnimationFrame(tick);
      } else {
        canvas.classList.remove('is-active');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    tick();
  }

  // ---- Utility ----
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    screens, show, toast,
    renderPlayerList, renderRoundIntro, renderRoulette,
    renderPerform, renderPass, renderScoring,
    renderRoundResults, renderFinal,
    stopTimer, onTimerEnd, getScoreValues,
    fireConfetti, escapeHtml,
  };
})();
