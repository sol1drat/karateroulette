/* =========================================================
   main.js — App entry point, event handlers, game flow
   ========================================================= */

(function () {

  // ---- Audio unlock on first interaction ----
  function unlockAudio() {
    Audio.ensureCtx();
    document.removeEventListener('pointerdown', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  }
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  // =========================================================
  // SETUP SCREEN
  // =========================================================

  const addForm = document.getElementById('add-player-form');
  const nameInput = document.getElementById('player-name-input');
  const playerList = document.getElementById('player-list');

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const player = Game.addPlayer(name);
    if (!player) {
      UI.toast('That fighter is already in!', 'crimson');
      return;
    }
    nameInput.value = '';
    nameInput.focus();
    Audio.tap();
    UI.renderPlayerList();
  });

  playerList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id = parseInt(btn.dataset.remove);
    Game.removePlayer(id);
    Audio.tap();
    UI.renderPlayerList();
  });

  // Time chips
  const timeOptions = document.getElementById('time-options');
  timeOptions.addEventListener('click', (e) => {
    const chip = e.target.closest('.time-chip');
    if (!chip) return;
    timeOptions.querySelectorAll('.time-chip').forEach(c => {
      c.classList.remove('is-active');
      c.setAttribute('aria-checked', 'false');
    });
    chip.classList.add('is-active');
    chip.setAttribute('aria-checked', 'true');
    Game.setComboTime(parseInt(chip.dataset.time));
    Audio.tap();
  });

  // Start game
  document.getElementById('start-game').addEventListener('click', () => {
    if (!Game.startMatch()) return;
    Audio.tap();
    startRound(1);
  });

  // =========================================================
  // ROUND INTRO SCREEN
  // =========================================================

  document.getElementById('round-start').addEventListener('click', () => {
    Audio.tap();
    Game.startRound(Game.getCurrentRound());
    goToRoulette();
  });

  function startRound(round) {
    Game.startRound(round);
    UI.renderRoundIntro(round);
    UI.show('roundIntro');
  }

  // =========================================================
  // ROULETTE SCREEN
  // =========================================================

  const spinBtn = document.getElementById('spin-btn');
  const rouletteStatus = document.getElementById('roulette-status');

  function goToRoulette() {
    const remaining = Game.getRemainingPerformers();
    UI.renderRoulette(remaining);
    spinBtn.disabled = false;
    spinBtn.style.display = '';
    rouletteStatus.textContent =
      remaining.length > 1 ? 'Tap to spin!' : 'One fighter left — spin!';
    UI.show('roulette');
  }

  spinBtn.addEventListener('click', doSpin);

  function doSpin() {
    if (Roulette.isSpinning()) return;
    const remaining = Game.getRemainingPerformers();
    if (remaining.length === 0) return;

    spinBtn.disabled = true;
    spinBtn.style.display = 'none';
    rouletteStatus.textContent = 'Spinning…';

    const pickIdx = Math.floor(Math.random() * remaining.length);
    const chosenPlayer = remaining[pickIdx];

    Roulette.spinTo(pickIdx, () => {
      // Set chosen performer (remove from available, set current)
      Game.setChosenPerformer(chosenPlayer.id);
      rouletteStatus.textContent = `${chosenPlayer.name} is up!`;
      setTimeout(() => goToPerform(), 900);
    });
  }

  // =========================================================
  // PERFORMANCE SCREEN (combo + timer combined)
  // =========================================================

  function goToPerform() {
    const performer = Game.getCurrentPerformer();
    const combo = Game.generateCurrentCombo();
    const duration = Game.getComboTime();
    const round = Game.getCurrentRound();
    UI.renderPerform(performer, combo, duration, round);
    UI.onTimerEnd(() => goToJudging());
    UI.show('perform');
  }

  document.getElementById('perform-done').addEventListener('click', () => {
    Audio.tap();
    UI.stopTimer();
    goToJudging();
  });

  // =========================================================
  // JUDGING FLOW
  // =========================================================

  function goToJudging() {
    const performer = Game.getCurrentPerformer();
    const first = Game.startJudging(performer.id);
    if (!first) {
      // No judges (e.g., only 1 player — shouldn't happen, but guard)
      Game.finalizePerformerScores();
      afterPerformer();
      return;
    }
    UI.renderPass(first.judge, first.performer);
    UI.show('pass');
  }

  document.getElementById('pass-ready').addEventListener('click', () => {
    Audio.tap();
    const judge = Game.getPlayer(Game.state.currentJudgeId);
    const performer = Game.getCurrentPerformer();
    UI.renderScoring(judge, performer);
    UI.show('score');
  });

  document.getElementById('score-submit').addEventListener('click', () => {
    const vals = UI.getScoreValues();
    if (!vals || !vals.accuracy || !vals.power || !vals.style) return;
    Audio.scoreUp();
    // submitJudgeScores returns the next judge pair, OR the finalize result
    // (when no more judges are left, nextJudge → finalizePerformerScores runs internally).
    const next = Game.submitJudgeScores(vals.accuracy, vals.power, vals.style);
    if (next && next.judge) {
      // More judges to go
      UI.renderPass(next.judge, next.performer);
      UI.show('pass');
    } else {
      // All judges done — scores already finalized inside submitJudgeScores
      afterPerformer();
    }
  });

  // After a performer finishes, check if round is over
  function afterPerformer() {
    const remaining = Game.getRemainingPerformers();
    if (remaining.length === 0) {
      // Round complete
      finishRound();
    } else {
      // Next performer
      goToRoulette();
    }
  }

  // =========================================================
  // ROUND RESULTS
  // =========================================================

  function finishRound() {
    const round = Game.getCurrentRound();
    const result = Game.endRound();
    Audio.roundComplete();
    UI.renderRoundResults(round, result.standings, result.newAchievements);
    UI.show('roundResults');
  }

  document.getElementById('results-next').addEventListener('click', () => {
    Audio.tap();
    const round = Game.getCurrentRound();
    if (round >= 3) {
      finishMatch();
    } else {
      startRound(round + 1);
    }
  });

  // =========================================================
  // FINAL SCOREBOARD
  // =========================================================

  function finishMatch() {
    const result = Game.getFinalStandings();
    UI.renderFinal(result.standings, result.winner, result.newAchievements);
    UI.show('final');
    setTimeout(() => {
      Audio.victory();
      UI.fireConfetti();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }, 600);
  }

  document.getElementById('play-again').addEventListener('click', () => {
    Audio.tap();
    // Keep players, reset scores
    Game.state.players.forEach(p => {
      p.totalScore = 0;
      p.roundScores = [];
      p.achievements = [];
    });
    Game.state.currentRound = 0;
    Game.state.achievementsUnlocked = new Set();
    Game.state.roundWinners = [];
    UI.renderPlayerList();
    UI.show('setup');
  });

  // =========================================================
  // Initial render
  // =========================================================
  UI.renderPlayerList();

})();
