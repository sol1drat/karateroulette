/* =============================================
   KARATE ROULETTE — GAME LOGIC
   ============================================= */

// ─── KARATE MOVES DATABASE ──────────────────
const KARATE_MOVES = [
  { name: "Front Kick",       icon: "🦵", type: "kick"  },
  { name: "Roundhouse Kick",  icon: "🌀", type: "kick"  },
  { name: "Side Kick",        icon: "💥", type: "kick"  },
  { name: "Back Kick",        icon: "⬛", type: "kick"  },
  { name: "Axe Kick",         icon: "🪓", type: "kick"  },
  { name: "Crescent Kick",    icon: "🌙", type: "kick"  },
  { name: "Knee Strike",      icon: "⚡", type: "strike"},
  { name: "Jab Punch",        icon: "👊", type: "strike"},
  { name: "Cross Punch",      icon: "✊", type: "strike"},
  { name: "Uppercut",         icon: "⬆️", type: "strike"},
  { name: "Hammer Fist",      icon: "🔨", type: "strike"},
  { name: "Knife Hand",       icon: "🔪", type: "strike"},
  { name: "Palm Strike",      icon: "🤚", type: "strike"},
  { name: "Elbow Strike",     icon: "🦴", type: "strike"},
  { name: "Block",            icon: "🛡️", type: "block" },
  { name: "Low Block",        icon: "⬇️", type: "block" },
  { name: "High Block",       icon: "☝️",  type: "block" },
  { name: "Spinning Back Fist",icon:"💫", type: "strike"},
  { name: "Jump Kick",        icon: "🚀", type: "kick"  },
  { name: "Sweep",            icon: "🌊", type: "kick"  },
];

const BELT_COLORS = [
  '#E8E8E8', // white
  '#F5C518', // yellow
  '#E8740C', // orange
  '#2D9E47', // green
  '#1A6FBF', // blue
  '#7B4F2E', // brown
  '#C8102E', // red
  '#1A1A1A', // black
];

const PLAYER_AVATARS = ['🥷','🧑‍🦱','👩‍🦰','🧔','👩','🧑‍🦲','🧑‍🦳','👱‍♀️'];

const WHEEL_SEGMENT_COLORS = [
  '#C8102E','#1A1A1A','#8B0000','#0A0A0A',
  '#991020','#222222','#B00020','#111111',
];

// ─── STATE ──────────────────────────────────
let state = {
  players: [],
  comboSeconds: 30,
  currentRound: 1,
  totalRounds: 3,
  playersThisRound: [],
  currentPlayerIndex: 0,
  currentPlayerName: '',
  currentCombo: [],
  scores: {},       // { playerName: { r1: N, r2: N, r3: N, total: N } }
  bonusApplied: { kiai: false, perfect: false, sensei: false },
  starRatings: { accuracy: 0, power: 0, style: 0 },
  timerInterval: null,
  timerRemaining: 0,
  wheelAngle: 0,
  animFrameId: null,
};

// ─── DOM HELPERS ────────────────────────────
const $ = id => document.getElementById(id);
const screens = {
  setup:          $('screen-setup'),
  playerRoulette: $('screen-player-roulette'),
  playerChosen:   $('screen-player-chosen'),
  comboRoulette:  $('screen-combo-roulette'),
  perform:        $('screen-perform'),
  scoring:        $('screen-scoring'),
  roundSummary:   $('screen-round-summary'),
  final:          $('screen-final'),
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    if (k === name) {
      el.classList.remove('exit');
      el.classList.add('active');
    } else if (el.classList.contains('active')) {
      el.classList.add('exit');
      setTimeout(() => {
        el.classList.remove('active', 'exit');
      }, 400);
    }
  });
  // scroll to top
  if (screens[name]) screens[name].scrollTop = 0;
}

function toast(msg, duration = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ─── SETUP SCREEN ───────────────────────────
const playerInput  = $('player-input');
const addPlayerBtn = $('add-player-btn');
const startBtn     = $('start-btn');
const playerListEl = $('player-list');

function renderPlayerList() {
  playerListEl.innerHTML = '';
  state.players.forEach((p, i) => {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    const belt = BELT_COLORS[i % BELT_COLORS.length];
    chip.innerHTML = `
      <span class="player-chip-avatar">${p.avatar}</span>
      <span class="player-chip-name">${p.name}</span>
      <span class="player-chip-belt" style="background:${belt}"></span>
      <button class="player-chip-remove" data-i="${i}">×</button>
    `;
    playerListEl.appendChild(chip);
  });
  startBtn.disabled = state.players.length < 2;
}

function addPlayer() {
  const name = playerInput.value.trim();
  if (!name) { toast('Enter a fighter name!'); return; }
  if (state.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    toast('That fighter is already in!'); return;
  }
  if (state.players.length >= 8) { toast('Max 8 fighters!'); return; }
  const avatar = PLAYER_AVATARS[state.players.length % PLAYER_AVATARS.length];
  state.players.push({ name, avatar });
  // init scores
  state.scores[name] = { r1: 0, r2: 0, r3: 0, total: 0 };
  playerInput.value = '';
  renderPlayerList();
  playerInput.focus();
}

addPlayerBtn.addEventListener('click', addPlayer);
playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

playerListEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-i]');
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  const removed = state.players.splice(i, 1)[0];
  delete state.scores[removed.name];
  renderPlayerList();
});

// Time options
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.comboSeconds = parseInt(btn.dataset.seconds);
    const labels = { 30:'30 seconds per combo', 45:'45 seconds per combo', 60:'60 seconds per combo', 0:'No time limit — perform at your own pace' };
    $('time-hint').textContent = labels[state.comboSeconds] || '';
  });
});

startBtn.addEventListener('click', () => {
  if (state.players.length < 2) return;
  // reset scores
  state.players.forEach(p => { state.scores[p.name] = { r1:0, r2:0, r3:0, total:0 }; });
  state.currentRound = 1;
  startRound();
});

// ─── ROUND MANAGEMENT ───────────────────────
function startRound() {
  state.playersThisRound = [...state.players];
  shuffleArray(state.playersThisRound);
  state.currentPlayerIndex = -1;
  showScreen('playerRoulette');
  updateRoundBadges();
  $('spin-player-btn').disabled = false;
  $('spin-status').textContent = 'Tap SPIN to choose a fighter';
  drawWheel(state.wheelAngle);
}

function updateRoundBadges() {
  const r = `ROUND ${state.currentRound}`;
  $('round-badge').textContent = r;
  $('combo-round-badge').textContent = r;
  $('summary-round-badge').textContent = `${r} COMPLETE`;
}

function nextPlayer() {
  state.currentPlayerIndex++;
  if (state.currentPlayerIndex >= state.playersThisRound.length) {
    showRoundSummary();
    return;
  }
  showScreen('playerRoulette');
  $('spin-player-btn').disabled = false;
  $('spin-status').textContent = 'Tap SPIN to choose a fighter';
  drawWheel(state.wheelAngle);
}

// ─── WHEEL CANVAS ───────────────────────────
function drawWheel(angle) {
  const canvas = $('player-wheel');
  const ctx = canvas.getContext('2d');
  const players = state.playersThisRound.length > 0 ? state.playersThisRound : state.players;
  const n = players.length;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = cx - 6;
  const slice = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < n; i++) {
    const start = angle + i * slice;
    const end   = start + slice;
    const color = WHEEL_SEGMENT_COLORS[i % WHEEL_SEGMENT_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#F0EDE8';
    ctx.font = `bold ${Math.min(14, Math.floor(300 / (n * 4)))}px Inter, sans-serif`;
    ctx.fillText(players[i].name.substring(0, 12), r - 10, 5);
    ctx.restore();
  }

  // outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#2A2A2A';
  ctx.lineWidth = 4;
  ctx.stroke();
}

// Spin player wheel
let isSpinning = false;
$('spin-player-btn').addEventListener('click', () => {
  if (isSpinning) return;
  const players = state.playersThisRound;
  if (!players.length) return;

  const targetPlayer = players[state.currentPlayerIndex + 1] || players[0];
  const targetIdx = players.indexOf(targetPlayer);
  const n = players.length;
  const slice = (2 * Math.PI) / n;

  // How many full spins + land on target
  const fullSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
  // We want pointer (top = -PI/2) to point at targetIdx's segment midpoint
  const targetMid = targetIdx * slice + slice / 2;
  const landAngle = -targetMid - Math.PI / 2;

  const startAngle = state.wheelAngle;
  const endAngle   = startAngle - fullSpins - (landAngle - startAngle + fullSpins) % (2 * Math.PI);
  const duration   = 3500 + Math.random() * 1000;
  const startTime  = performance.now();

  isSpinning = true;
  $('spin-player-btn').disabled = true;
  $('spin-status').textContent = 'Spinning…';

  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutQuart(t);
    state.wheelAngle = startAngle + (endAngle - startAngle) * eased;
    drawWheel(state.wheelAngle);

    if (t < 1) {
      state.animFrameId = requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      state.wheelAngle = endAngle;
      // figure out which segment the pointer landed on
      const normalised = (((-state.wheelAngle - Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const chosenIdx = Math.floor(normalised / slice) % n;
      const chosen = players[chosenIdx];
      state.currentPlayerName = chosen.name;
      $('spin-status').textContent = `🎉 ${chosen.name} steps up!`;

      setTimeout(() => showChosenScreen(chosen), 700);
    }
  }

  requestAnimationFrame(animate);
});

// ─── PLAYER CHOSEN SCREEN ───────────────────
function showChosenScreen(player) {
  const idx = state.players.findIndex(p => p.name === player.name);
  const belt = BELT_COLORS[idx % BELT_COLORS.length];
  $('chosen-avatar').textContent = player.avatar;
  $('chosen-name').textContent   = player.name.toUpperCase();
  $('chosen-belt').style.background = belt;
  showScreen('playerChosen');
}

$('goto-combo-btn').addEventListener('click', () => {
  showScreen('comboRoulette');
  setTimeout(() => {
    $('spin-combo-btn').disabled = false;
  }, 300);
  resetSlots();
});

// ─── COMBO ROULETTE ──────────────────────────
const COMBO_SIZE = [0, 2, 3, 4]; // index by round

function resetSlots() {
  const size = COMBO_SIZE[state.currentRound];
  const slots = ['slot-1','slot-2','slot-3','slot-4'];
  const connectors = ['conn-1','conn-2','conn-3'];

  for (let i = 0; i < 4; i++) {
    const el = $(slots[i]);
    if (i < size) {
      el.classList.remove('hidden');
      el.innerHTML = '<span>?</span>';
      el.classList.remove('spinning');
      el.style.borderColor = '';
      el.style.boxShadow = '';
    } else {
      el.classList.add('hidden');
    }
  }

  // connectors: show conn-1 always (between slot 1&2), conn-2 for 3+ moves, conn-3 for 4 moves
  $('conn-1').classList.toggle('hidden', size < 2);
  $('conn-2').classList.toggle('hidden', size < 3);
  $('conn-3').classList.toggle('hidden', size < 4);
}

$('spin-combo-btn').addEventListener('click', () => {
  $('spin-combo-btn').disabled = true;
  const size = COMBO_SIZE[state.currentRound];
  const slots = ['slot-1','slot-2','slot-3','slot-4'].slice(0, size);
  const chosen = [];

  // pick unique moves
  const pool = [...KARATE_MOVES];
  shuffleArray(pool);
  for (let i = 0; i < size; i++) chosen.push(pool[i]);

  // animate each slot sequentially
  slots.forEach((slotId, i) => {
    const el = $(slotId);
    el.style.borderColor = '';
    el.style.boxShadow = '';
    el.classList.add('spinning');
    el.innerHTML = '<span>…</span>';

    setTimeout(() => {
      let flicker = 0;
      const flickerInterval = setInterval(() => {
        const fake = KARATE_MOVES[Math.floor(Math.random() * KARATE_MOVES.length)];
        el.innerHTML = `<span>${fake.icon}<br>${fake.name}</span>`;
        flicker++;
        if (flicker > 10) {
          clearInterval(flickerInterval);
          el.classList.remove('spinning');
          el.innerHTML = `<span>${chosen[i].icon}<br>${chosen[i].name}</span>`;
          el.style.borderColor = 'var(--red)';
          el.style.boxShadow = '0 0 12px rgba(200,16,46,0.4)';
        }
      }, 80);
    }, i * 550);
  });

  const totalDelay = size * 550 + 950;
  setTimeout(() => {
    state.currentCombo = chosen;
    setTimeout(() => showPerformScreen(), 700);
  }, totalDelay);
});

// ─── PERFORM SCREEN ──────────────────────────
function showPerformScreen() {
  clearInterval(state.timerInterval);
  $('perform-name').textContent = state.currentPlayerName.toUpperCase();

  // render combo pills
  const display = $('combo-display');
  display.innerHTML = '';
  state.currentCombo.forEach((move, i) => {
    if (i > 0) {
      const arr = document.createElement('span');
      arr.style.cssText = 'color:var(--red);font-size:18px;font-weight:900;';
      arr.textContent = '→';
      display.appendChild(arr);
    }
    const pill = document.createElement('div');
    pill.className = 'combo-pill';
    pill.innerHTML = `<span class="move-icon">${move.icon}</span>${move.name}`;
    display.appendChild(pill);
  });

  // timer
  const timerContainer = $('timer-container');
  const infinityBadge  = $('infinity-badge');
  const circle         = $('timer-circle');
  const timerNum       = $('timer-num');
  const circumference  = 327; // 2π×52

  if (state.comboSeconds === 0) {
    timerContainer.style.display = 'none';
    infinityBadge.classList.remove('hidden');
  } else {
    timerContainer.style.display = '';
    infinityBadge.classList.add('hidden');
    state.timerRemaining = state.comboSeconds;
    timerNum.textContent = state.timerRemaining;
    circle.style.strokeDashoffset = 0;

    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      timerNum.textContent = state.timerRemaining;
      const progress = 1 - state.timerRemaining / state.comboSeconds;
      circle.style.strokeDashoffset = circumference * progress;

      // color urgency
      if (state.timerRemaining <= 5) {
        circle.style.stroke = '#FFD700';
        timerNum.style.color = '#FFD700';
      } else if (state.timerRemaining <= 10) {
        circle.style.stroke = '#FF6B00';
      } else {
        circle.style.stroke = 'var(--red)';
        timerNum.style.color = 'var(--white)';
      }

      if (state.timerRemaining <= 0) {
        clearInterval(state.timerInterval);
        timerNum.textContent = '0';
        toast('⏱️ Time\'s up! Score the fighter.');
        setTimeout(() => showScoringScreen(), 800);
      }
    }, 1000);
  }

  showScreen('perform');
}

$('done-btn').addEventListener('click', () => {
  clearInterval(state.timerInterval);
  showScoringScreen();
});

// ─── SCORING SCREEN ──────────────────────────
function showScoringScreen() {
  $('scoring-name').textContent = state.currentPlayerName.toUpperCase();
  state.starRatings = { accuracy: 0, power: 0, style: 0 };
  state.bonusApplied = { kiai: false, perfect: false, sensei: false };
  $('score-total-val').textContent = '–';
  $('bonus-hint').textContent = '';
  $('submit-score-btn').disabled = true;

  // reset stars
  document.querySelectorAll('.star').forEach(s => s.classList.remove('lit'));

  // reset bonus buttons
  ['bonus-kiai','bonus-perfect','bonus-sensei'].forEach(id => {
    const btn = $(id);
    btn.classList.remove('applied');
    btn.disabled = false;
  });

  showScreen('scoring');
}

// Star rating
document.querySelectorAll('.score-stars').forEach(row => {
  row.addEventListener('click', e => {
    const star = e.target.closest('.star');
    if (!star) return;
    const cat = row.dataset.cat;
    const val = parseInt(star.dataset.val);
    state.starRatings[cat] = val;

    // light up stars
    row.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('lit', parseInt(s.dataset.val) <= val);
    });

    updateScoreTotal();
  });
});

function updateScoreTotal() {
  const { accuracy, power, style } = state.starRatings;
  const base = accuracy + power + style;
  let bonus = 0;
  if (state.bonusApplied.kiai)    bonus += 1;
  if (state.bonusApplied.perfect) bonus += 2;
  if (state.bonusApplied.sensei)  bonus += 3;

  const total = base + bonus;
  const allRated = accuracy > 0 && power > 0 && style > 0;
  $('score-total-val').textContent = allRated ? total : '–';
  $('submit-score-btn').disabled = !allRated;
}

// Bonus buttons
$('bonus-kiai').addEventListener('click', () => toggleBonus('kiai', $('bonus-kiai'), '+1 Kiai Spirit added!'));
$('bonus-perfect').addEventListener('click', () => toggleBonus('perfect', $('bonus-perfect'), '+2 Perfect Form added!'));
$('bonus-sensei').addEventListener('click', () => toggleBonus('sensei', $('bonus-sensei'), "+3 Sensei's Nod added!"));

function toggleBonus(key, btn, msg) {
  if (state.bonusApplied[key]) {
    state.bonusApplied[key] = false;
    btn.classList.remove('applied');
    $('bonus-hint').textContent = '';
  } else {
    state.bonusApplied[key] = true;
    btn.classList.add('applied');
    $('bonus-hint').textContent = msg;
  }
  updateScoreTotal();
}

$('submit-score-btn').addEventListener('click', () => {
  const { accuracy, power, style } = state.starRatings;
  let bonus = 0;
  if (state.bonusApplied.kiai)    bonus += 1;
  if (state.bonusApplied.perfect) bonus += 2;
  if (state.bonusApplied.sensei)  bonus += 3;
  const total = accuracy + power + style + bonus;

  const p = state.currentPlayerName;
  const rKey = `r${state.currentRound}`;
  state.scores[p][rKey] = (state.scores[p][rKey] || 0) + total;
  state.scores[p].total = (state.scores[p].total || 0) + total;

  toast(`${p}: ${total} pts scored! 🥋`);
  setTimeout(() => nextPlayer(), 600);
});

// ─── ROUND SUMMARY ───────────────────────────
function showRoundSummary() {
  const board = $('summary-board');
  board.innerHTML = '';

  const sorted = [...state.players].sort((a, b) => {
    const rKey = `r${state.currentRound}`;
    return (state.scores[b.name][rKey] || 0) - (state.scores[a.name][rKey] || 0);
  });

  sorted.forEach((p, i) => {
    const rKey = `r${state.currentRound}`;
    const roundScore = state.scores[p.name][rKey] || 0;
    const total = state.scores[p.name].total || 0;
    const rankClass = ['gold','silver','bronze'][i] || '';
    const medals = ['🥇','🥈','🥉'];
    const medal = medals[i] || `${i+1}`;

    const row = document.createElement('div');
    row.className = `summary-row${i === 0 ? ' first-place' : ''}`;
    row.style.animationDelay = `${i * 0.08}s`;
    row.innerHTML = `
      <span class="summary-rank ${rankClass}">${medal}</span>
      <div style="flex:1">
        <div class="summary-player-name">${p.avatar} ${p.name}</div>
        <div class="summary-total">Total: ${total} pts</div>
      </div>
      <span class="summary-round-score">+${roundScore}</span>
    `;
    board.appendChild(row);
  });

  const nextBtn = $('next-round-btn');
  if (state.currentRound >= state.totalRounds) {
    nextBtn.textContent = 'SEE FINAL RESULTS 🏆';
  } else {
    nextBtn.textContent = `START ROUND ${state.currentRound + 1} ▶`;
  }

  showScreen('roundSummary');
}

$('next-round-btn').addEventListener('click', () => {
  if (state.currentRound >= state.totalRounds) {
    showFinalScreen();
  } else {
    state.currentRound++;
    startRound();
  }
});

// ─── FINAL SCREEN ────────────────────────────
function showFinalScreen() {
  const sorted = [...state.players].sort((a, b) =>
    (state.scores[b.name].total || 0) - (state.scores[a.name].total || 0)
  );

  const winner = sorted[0];
  $('final-winner-name').textContent = winner.name.toUpperCase();

  const board = $('final-board');
  board.innerHTML = '';

  sorted.forEach((p, i) => {
    const total = state.scores[p.name].total || 0;
    const r1 = state.scores[p.name].r1 || 0;
    const r2 = state.scores[p.name].r2 || 0;
    const r3 = state.scores[p.name].r3 || 0;
    const medals = ['🥇','🥈','🥉'];
    const medal = medals[i] || `${i+1}`;

    const row = document.createElement('div');
    row.className = `final-row${i === 0 ? ' winner-row' : ''}`;
    row.style.animationDelay = `${i * 0.1}s`;
    row.innerHTML = `
      <span class="final-rank">${medal}</span>
      <div style="flex:1">
        <div class="final-player-name">${p.avatar} ${p.name}</div>
      </div>
      <div class="final-score-breakdown">
        <span class="final-total">${total}</span>
        <span class="final-breakdown-detail">R1:${r1} R2:${r2} R3:${r3}</span>
      </div>
    `;
    board.appendChild(row);
  });

  showScreen('final');
  if (winner) launchConfetti();
}

$('play-again-btn').addEventListener('click', () => {
  state.players = [];
  state.scores = {};
  state.currentRound = 1;
  state.wheelAngle = 0;
  clearInterval(state.timerInterval);
  stopConfetti();
  renderPlayerList();
  showScreen('setup');
  drawWheel(0);
});

// ─── CONFETTI ────────────────────────────────
let confettiAnimId = null;
let confettiParticles = [];

function launchConfetti() {
  let canvas = $('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  confettiParticles = [];
  const colors = ['#C8102E','#FFD700','#F0EDE8','#1A6FBF','#2D9E47'];

  for (let i = 0; i < 120; i++) {
    confettiParticles.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 200,
      w: 6 + Math.random() * 8,
      h: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
    });
    confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 20);
    if (confettiParticles.length > 0) {
      confettiAnimId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw();
}

function stopConfetti() {
  cancelAnimationFrame(confettiAnimId);
  const canvas = $('confetti-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  confettiParticles = [];
}

// ─── UTILITIES ───────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── INIT ─────────────────────────────────────
drawWheel(0);
