/* =========================================================
   game.js — Game state machine, scoring, round flow
   ========================================================= */

const Game = (function () {

  // ---- State ----
  const state = {
    players: [],          // [{ id, name, color, initials, totalScore, roundScores: [], achievements: [] }]
    comboTime: 30,        // seconds; 0 = indefinite
    currentRound: 0,      // 1..3
    availablePlayerIds: [], // players who haven't performed this round
    currentPerformerId: null,
    currentCombo: null,
    judgeQueue: [],       // remaining judges for current performer
    currentJudgeId: null,
    pendingScores: [],    // [{ judgeId, accuracy, power, style }]
    achievementsUnlocked: new Set(),
    roundWinners: [],     // winner id per round
  };

  let nextPlayerId = 1;

  // ---- Player management ----

  function addPlayer(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    // Prevent duplicates (case-insensitive)
    if (state.players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return null;
    }
    const player = {
      id: nextPlayerId++,
      name: trimmed,
      color: KarateData.avatarColor(trimmed),
      initials: KarateData.initials(trimmed),
      totalScore: 0,
      roundScores: [],
      achievements: [],
    };
    state.players.push(player);
    return player;
  }

  function removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id);
  }

  function getPlayers() { return state.players.slice(); }
  function getPlayer(id) { return state.players.find(p => p.id === id); }

  // ---- Combo time ----
  function setComboTime(seconds) { state.comboTime = seconds; }
  function getComboTime() { return state.comboTime; }

  // ---- Match start ----
  function startMatch() {
    if (state.players.length < 2) return false;
    state.currentRound = 0;
    state.players.forEach(p => {
      p.totalScore = 0;
      p.roundScores = [];
      p.achievements = [];
    });
    state.achievementsUnlocked = new Set();
    state.roundWinners = [];
    return true;
  }

  function startRound(round) {
    state.currentRound = round;
    state.availablePlayerIds = state.players.map(p => p.id);
    shuffleArray(state.availablePlayerIds);
  }

  function getRemainingPerformers() {
    return state.availablePlayerIds.map(id => getPlayer(id));
  }

  function pickNextPerformer() {
    if (state.availablePlayerIds.length === 0) return null;
    // Truly random pick from remaining
    const idx = Math.floor(Math.random() * state.availablePlayerIds.length);
    const id = state.availablePlayerIds[idx];
    state.availablePlayerIds.splice(idx, 1);
    state.currentPerformerId = id;
    return getPlayer(id);
  }

  // Set a specific player as the chosen performer (used after roulette lands)
  function setChosenPerformer(playerId) {
    const idx = state.availablePlayerIds.indexOf(playerId);
    if (idx === -1) return null;
    state.availablePlayerIds.splice(idx, 1);
    state.currentPerformerId = playerId;
    return getPlayer(playerId);
  }

  function getCurrentPerformer() { return getPlayer(state.currentPerformerId); }

  function generateCurrentCombo() {
    state.currentCombo = KarateData.generateCombo(state.currentRound);
    return state.currentCombo;
  }

  function getCurrentCombo() { return state.currentCombo; }

  function getCurrentRound() { return state.currentRound; }

  // ---- Scoring flow ----
  function startJudging(performerId) {
    state.currentPerformerId = performerId;
    state.pendingScores = [];
    state.judgeQueue = state.players
      .filter(p => p.id !== performerId)
      .map(p => p.id);
    shuffleArray(state.judgeQueue);
    return state.judgeQueue.length > 0 ? nextJudge() : null;
  }

  function nextJudge() {
    if (state.judgeQueue.length === 0) {
      return finalizePerformerScores();
    }
    state.currentJudgeId = state.judgeQueue.shift();
    return { judge: getPlayer(state.currentJudgeId), performer: getPlayer(state.currentPerformerId) };
  }

  function submitJudgeScores(accuracy, power, style) {
    state.pendingScores.push({
      judgeId: state.currentJudgeId,
      accuracy: clamp(accuracy, 1, 10),
      power: clamp(power, 1, 10),
      style: clamp(style, 1, 10),
    });
    return nextJudge();
  }

  // Average all judges' scores → final score out of 30 for this performer this round
  function finalizePerformerScores() {
    const performer = getPlayer(state.currentPerformerId);
    if (!performer || state.pendingScores.length === 0) return null;

    const n = state.pendingScores.length;
    const sums = state.pendingScores.reduce((acc, s) => ({
      accuracy: acc.accuracy + s.accuracy,
      power: acc.power + s.power,
      style: acc.style + s.style,
    }), { accuracy: 0, power: 0, style: 0 });

    const avg = {
      accuracy: sums.accuracy / n,
      power: sums.power / n,
      style: sums.style / n,
    };
    const roundScore = Math.round(avg.accuracy + avg.power + avg.style); // out of 30

    performer.roundScores[state.currentRound - 1] = {
      round: state.currentRound,
      score: roundScore,
      accuracy: avg.accuracy,
      power: avg.power,
      style: avg.style,
      combo: state.currentCombo,
    };
    performer.totalScore += roundScore;

    // Clear pendingScores so subsequent calls don't double-count
    state.pendingScores = [];

    return { performer, roundScore, avg };
  }

  // ---- Round end / achievements ----
  function endRound() {
    const round = state.currentRound;
    const roundScores = state.players
      .map(p => ({ player: p, score: p.roundScores[round - 1]?.score || 0 }))
      .sort((a, b) => b.score - a.score);

    const winner = roundScores[0]?.player;
    if (winner) state.roundWinners.push(winner.id);

    // Per-round achievement checks
    const newAchievements = [];

    // First Blood: first 25+ in this round
    const firstBlood = roundScores.find(r => r.score >= 25);
    if (firstBlood && !state.achievementsUnlocked.has('first_blood')) {
      state.achievementsUnlocked.add('first_blood');
      firstBlood.player.achievements.push('first_blood');
      newAchievements.push({ player: firstBlood.player, achId: 'first_blood' });
    }

    // Flawless: 30 in a round
    const flawless = roundScores.find(r => r.score === 30);
    if (flawless && !state.achievementsUnlocked.has('flawless')) {
      state.achievementsUnlocked.add('flawless');
      flawless.player.achievements.push('flawless');
      newAchievements.push({ player: flawless.player, achId: 'flawless' });
    }

    // Combo Master: 4-move combo performed this round (round 3)
    if (round === 3) {
      state.players.forEach(p => {
        if (!state.achievementsUnlocked.has('combo_master') && !p.achievements.includes('combo_master')) {
          state.achievementsUnlocked.add('combo_master');
          p.achievements.push('combo_master');
          newAchievements.push({ player: p, achId: 'combo_master' });
        }
      });
    }

    // Per-category highs
    const catHighs = { accuracy: 0, power: 0, style: 0 };
    const catWinners = { accuracy: null, power: null, style: null };
    state.players.forEach(p => {
      const rs = p.roundScores[round - 1];
      if (!rs) return;
      ['accuracy', 'power', 'style'].forEach(cat => {
        if (rs[cat] > catHighs[cat]) {
          catHighs[cat] = rs[cat];
          catWinners[cat] = p;
        }
      });
    });
    const catAchMap = { accuracy: 'precision', power: 'power_house', style: 'crowd_favorite' };
    ['accuracy', 'power', 'style'].forEach(cat => {
      const achId = catAchMap[cat];
      if (catWinners[cat] && !state.achievementsUnlocked.has(achId)) {
        state.achievementsUnlocked.add(achId);
        catWinners[cat].achievements.push(achId);
        newAchievements.push({ player: catWinners[cat], achId });
      }
    });

    return { standings: roundScores, winner, newAchievements };
  }

  // ---- Match end ----
  function isMatchOver() {
    return state.currentRound >= 3 && state.availablePlayerIds.length === 0;
  }

  function getFinalStandings() {
    const standings = state.players
      .map(p => ({ player: p, score: p.totalScore }))
      .sort((a, b) => b.score - a.score);

    const newAchievements = [];

    // Iron Will: everyone who finished all 3 rounds
    state.players.forEach(p => {
      if (p.roundScores.length === 3 && p.roundScores.every(rs => rs) && !state.achievementsUnlocked.has('iron_will')) {
        state.achievementsUnlocked.add('iron_will');
        p.achievements.push('iron_will');
        newAchievements.push({ player: p, achId: 'iron_will' });
      }
    });

    // The Sweep: won every round
    const winner = standings[0]?.player;
    if (winner && state.roundWinners.every(id => id === winner.id) && state.roundWinners.length === 3) {
      if (!state.achievementsUnlocked.has('sweep')) {
        state.achievementsUnlocked.add('sweep');
        winner.achievements.push('sweep');
        newAchievements.push({ player: winner, achId: 'sweep' });
      }
    }

    // Underdog: last place after round 1, won the match
    if (winner) {
      const r1Scores = state.players
        .map(p => ({ id: p.id, score: p.roundScores[0]?.score || 0 }))
        .sort((a, b) => a.score - b.score);
      if (r1Scores[0]?.id === winner.id && !state.achievementsUnlocked.has('underdog')) {
        state.achievementsUnlocked.add('underdog');
        winner.achievements.push('underdog');
        newAchievements.push({ player: winner, achId: 'underdog' });
      }
    }

    // Comeback Kid: was last after round 1, ends in top half
    if (winner) {
      const r1Sorted = state.players
        .map(p => ({ id: p.id, score: p.roundScores[0]?.score || 0 }))
        .sort((a, b) => a.score - b.score);
      const lastAfterR1 = r1Sorted[0]?.id;
      const winnerIdx = standings.findIndex(s => s.player.id === lastAfterR1);
      if (winnerIdx > 0 && winnerIdx < standings.length / 2 && !state.achievementsUnlocked.has('comeback')) {
        state.achievementsUnlocked.add('comeback');
        const comebackPlayer = standings[winnerIdx].player;
        comebackPlayer.achievements.push('comeback');
        newAchievements.push({ player: comebackPlayer, achId: 'comeback' });
      }
    }

    return { standings, winner, newAchievements };
  }

  // ---- Helpers ----
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function reset() {
    state.players = [];
    state.comboTime = 30;
    state.currentRound = 0;
    state.availablePlayerIds = [];
    state.currentPerformerId = null;
    state.currentCombo = null;
    state.judgeQueue = [];
    state.currentJudgeId = null;
    state.pendingScores = [];
    state.achievementsUnlocked = new Set();
    state.roundWinners = [];
    nextPlayerId = 1;
  }

  return {
    state,
    addPlayer, removePlayer, getPlayers, getPlayer,
    setComboTime, getComboTime,
    startMatch, startRound,
    getRemainingPerformers, pickNextPerformer, setChosenPerformer, getCurrentPerformer,
    generateCurrentCombo, getCurrentCombo, getCurrentRound,
    startJudging, nextJudge, submitJudgeScores, finalizePerformerScores,
    endRound, isMatchOver, getFinalStandings,
    reset,
  };
})();
