/* =========================================================
   data.js — Karate moves, belts, achievements, combo names
   ========================================================= */

const KarateData = (function () {

  // ---- Move pool, grouped by category ----
  const MOVES = {
    punch: [
      { en: 'Jab',                jp: 'Kizami Zuki' },
      { en: 'Reverse Punch',      jp: 'Gyaku Zuki' },
      { en: 'Lunge Punch',        jp: 'Oi Zuki' },
      { en: 'Hook Punch',         jp: 'Kage Zuki' },
      { en: 'Uppercut',           jp: 'Age Zuki' },
      { en: 'Backfist Strike',    jp: 'Uraken Uchi' },
      { en: 'Palm Heel Strike',   jp: 'Teisho Uchi' },
    ],
    kick: [
      { en: 'Front Kick',         jp: 'Mae Geri' },
      { en: 'Roundhouse Kick',    jp: 'Mawashi Geri' },
      { en: 'Side Kick',          jp: 'Yoko Geri Keage' },
      { en: 'Side Thrust Kick',   jp: 'Yoko Geri Kekomi' },
      { en: 'Back Kick',          jp: 'Ushiro Geri' },
      { en: 'Hook Kick',          jp: 'Ura Mawashi Geri' },
      { en: 'Crescent Kick',      jp: 'Mikazuki Geri' },
      { en: 'Knee Strike',        jp: 'Hiza Geri' },
    ],
    block: [
      { en: 'Rising Block',       jp: 'Jodan Age Uke' },
      { en: 'Low Block',          jp: 'Gedan Barai' },
      { en: 'Outside Block',      jp: 'Soto Uke' },
      { en: 'Inside Block',       jp: 'Uchi Uke' },
      { en: 'Knife-hand Block',   jp: 'Shuto Uke' },
      { en: 'X-Block',            jp: 'Juji Uke' },
    ],
    strike: [
      { en: 'Knife-hand Strike',  jp: 'Shuto Uchi' },
      { en: 'Elbow Strike',       jp: 'Empi Uchi' },
      { en: 'Ridge-hand Strike',  jp: 'Haito Uchi' },
      { en: 'Spear-hand Strike',  jp: 'Nukite' },
      { en: 'Hammer-fist Strike', jp: 'Tetsui Uchi' },
    ],
  };

  // Move difficulty weights (used for star rating)
  const DIFFICULTY = {
    punch: 1, block: 1, strike: 2, kick: 3,
  };

  // Modifiers that can prefix any move (higher rounds = more chance)
  const MODIFIERS = [
    { en: 'Jumping',  jp: 'Tobi',    weight: 3 },
    { en: 'Spinning', jp: 'Kaiten',  weight: 3 },
    { en: 'Reverse',  jp: 'Gyaku',   weight: 2 },
    { en: 'Double',   jp: 'Nidan',   weight: 2 },
  ];

  // ---- Combo name generator (for flavor) ----
  const COMBO_NAMES = {
    prefixes: ['Thunder', 'Iron', 'Crimson', 'Silent', 'Shadow', 'Phoenix', 'Dragon', 'Tiger', 'Storm', 'Venom', 'Stone', 'Wind', 'Flame', 'Jade'],
    suffixes: ['Fang', 'Fist', 'Strike', 'Wave', 'Path', 'Bloom', 'Roar', 'Edge', 'Dance', 'Crash', 'Burst', 'Vortex', 'Storm', 'Bloom'],
    jp: ['Ichigeki', 'Renraku', 'Kaiten', 'Tatsumaki', 'Raiu', 'Jinrai', 'Shippu', 'Suiryu', 'Karyu', 'Hyaku'],
  };

  // ---- Round definitions ----
  const ROUNDS = [
    { round: 1, moves: 2, title: 'Foundation', desc: 'Short, sharp combinations. Focus on form and crisp execution.' },
    { round: 2, moves: 3, title: 'Flow',       desc: 'Link three techniques. Transitions matter — keep it smooth.' },
    { round: 3, moves: 4, title: 'Mastery',    desc: 'Four moves. Show everything you have. This is where legends are made.' },
  ];

  // ---- Belt progression (based on cumulative score out of 90) ----
  const BELTS = [
    { min: 0,  name: 'White Belt',  short: 'White',  color: '#f5f5f7', text: '#1a1a1a' },
    { min: 25, name: 'Yellow Belt', short: 'Yellow', color: '#facc15', text: '#1a1a1a' },
    { min: 40, name: 'Orange Belt', short: 'Orange', color: '#fb923c', text: '#1a1a1a' },
    { min: 55, name: 'Green Belt',  short: 'Green',  color: '#22c55e', text: '#1a1a1a' },
    { min: 68, name: 'Blue Belt',   short: 'Blue',   color: '#3b82f6', text: '#fff'    },
    { min: 78, name: 'Brown Belt',  short: 'Brown',  color: '#92400e', text: '#fff'    },
    { min: 86, name: 'Black Belt',  short: 'Black',  color: '#0a0a0a', text: '#fbbf24' },
  ];

  // ---- Achievements ----
  const ACHIEVEMENTS = [
    { id: 'first_blood',    icon: '🩸', label: 'First Blood',    desc: 'First fighter to score 25+ in a round' },
    { id: 'flawless',       icon: '💎', label: 'Flawless',       desc: 'Scored a perfect 30 in a round' },
    { id: 'combo_master',   icon: '🎯', label: 'Combo Master',   desc: 'Nailed a 4-move combo' },
    { id: 'crowd_favorite', icon: '🎭', label: 'Crowd Favorite', desc: 'Highest Style score of the round' },
    { id: 'power_house',    icon: '💥', label: 'Power House',    desc: 'Highest Power score of the round' },
    { id: 'precision',      icon: '🎯', label: 'Precision',      desc: 'Highest Accuracy score of the round' },
    { id: 'underdog',       icon: '🔥', label: 'Underdog',       desc: 'Last place after R1, won the match' },
    { id: 'iron_will',      icon: '🛡', label: 'Iron Will',      desc: 'Completed all 3 rounds' },
    { id: 'sweep',          icon: '👑', label: 'The Sweep',      desc: 'Won every round' },
    { id: 'comeback',       icon: '⚡', label: 'Comeback Kid',   desc: 'Climbed from last to first' },
  ];

  // ---- Winner titles (based on final score) ----
  const WINNER_TITLES = [
    { min: 86, title: 'Karate Legend' },
    { min: 78, title: 'Grand Champion' },
    { min: 68, title: 'Tournament Champion' },
    { min: 55, title: 'Dojo Champion' },
    { min: 40, title: 'Rising Star' },
    { min: 25, title: 'Promising Fighter' },
    { min: 0,  title: 'Brave Beginner' },
  ];

  // ---- Avatar color palette ----
  const AVATAR_COLORS = [
    '#e11d2e', '#fbbf24', '#3b82f6', '#10b981',
    '#a855f7', '#ec4899', '#14b8a6', '#f97316',
    '#84cc16', '#06b6d4', '#8b5cf6', '#ef4444',
  ];

  // =========================================================
  // Helpers
  // =========================================================

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function initials(name) {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Generate a random combo for a round
  function generateCombo(round) {
    const roundDef = ROUNDS[round - 1];
    const numMoves = roundDef.moves;
    const allMoves = [
      ...MOVES.punch.map(m => ({ ...m, cat: 'punch' })),
      ...MOVES.kick.map(m => ({ ...m, cat: 'kick' })),
      ...MOVES.block.map(m => ({ ...m, cat: 'block' })),
      ...MOVES.strike.map(m => ({ ...m, cat: 'strike' })),
    ];

    // Round 1: only punches + blocks + simple kicks (no modifiers)
    // Round 2: full pool, occasional modifier
    // Round 3: full pool, more modifiers
    let pool;
    if (round === 1) {
      pool = allMoves.filter(m => m.cat === 'punch' || m.cat === 'block' || (m.cat === 'kick' && ['Front Kick', 'Roundhouse Kick', 'Side Kick'].includes(m.en)));
    } else {
      pool = allMoves;
    }

    const modifierChance = round === 1 ? 0 : round === 2 ? 0.25 : 0.45;

    const chosen = shuffle(pool).slice(0, numMoves).map(move => {
      let useMod = Math.random() < modifierChance;
      // Don't put a modifier on every move
      const mod = useMod ? pick(MODIFIERS) : null;
      return {
        en: mod ? `${mod.en} ${move.en}` : move.en,
        jp: mod ? `${mod.jp} ${move.jp}` : move.jp,
        cat: move.cat,
        difficulty: DIFFICULTY[move.cat] + (mod ? mod.weight : 0),
      };
    });

    // Difficulty rating (1-3 stars)
    const totalDiff = chosen.reduce((s, m) => s + m.difficulty, 0);
    let stars;
    if (round === 1) stars = totalDiff <= 3 ? 1 : 2;
    else if (round === 2) stars = totalDiff <= 6 ? 2 : 3;
    else stars = totalDiff <= 9 ? 2 : 3;

    // Flavor name
    const name = `${pick(COMBO_NAMES.prefixes)} ${pick(COMBO_NAMES.suffixes)}`;

    return { moves: chosen, stars, name, round };
  }

  // Get belt for a given cumulative score
  function getBelt(score) {
    let belt = BELTS[0];
    for (const b of BELTS) {
      if (score >= b.min) belt = b;
    }
    return belt;
  }

  // Get winner title for a given final score
  function getWinnerTitle(score) {
    for (const t of WINNER_TITLES) {
      if (score >= t.min) return t.title;
    }
    return WINNER_TITLES[WINNER_TITLES.length - 1].title;
  }

  function getAchievement(id) {
    return ACHIEVEMENTS.find(a => a.id === id);
  }

  function getRound(round) {
    return ROUNDS[round - 1];
  }

  return {
    MOVES,
    ROUNDS,
    BELTS,
    ACHIEVEMENTS,
    AVATAR_COLORS,
    generateCombo,
    getBelt,
    getWinnerTitle,
    getAchievement,
    getRound,
    avatarColor,
    initials,
    pick,
    shuffle,
  };
})();
