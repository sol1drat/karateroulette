/* =========================================================
   audio.js — Tiny Web Audio synth for SFX (no files needed)
   ========================================================= */

const Audio = (function () {
  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        enabled = false;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Generic tone
  function tone(freq, dur = 0.1, type = 'sine', vol = 0.15, when = 0) {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Tick (roulette)
  function tick() {
    tone(880, 0.04, 'square', 0.07);
  }

  // Whoosh (roulette spin start)
  function whoosh() {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t0);
    filter.frequency.exponentialRampToValueAtTime(3500, t0 + 0.6);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.6);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc.connect(filter).connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.75);
  }

  // Ding (result reveal)
  function ding() {
    tone(1320, 0.15, 'triangle', 0.18);
    tone(1760, 0.25, 'triangle', 0.12, 0.08);
  }

  // Tap (button press)
  function tap() {
    tone(420, 0.05, 'square', 0.08);
  }

  // Star pop (when a star is selected)
  function starPop() {
    tone(660, 0.06, 'triangle', 0.1);
  }

  // Score submit (rising arpeggio)
  function scoreUp() {
    tone(523, 0.1, 'triangle', 0.15, 0);
    tone(659, 0.1, 'triangle', 0.15, 0.08);
    tone(784, 0.15, 'triangle', 0.15, 0.16);
  }

  // Round complete
  function roundComplete() {
    tone(523, 0.12, 'sine', 0.18, 0);
    tone(659, 0.12, 'sine', 0.18, 0.1);
    tone(784, 0.12, 'sine', 0.18, 0.2);
    tone(1047, 0.3, 'sine', 0.2, 0.3);
  }

  // Victory fanfare
  function victory() {
    const notes = [
      { f: 523, t: 0,    d: 0.12 },
      { f: 659, t: 0.12, d: 0.12 },
      { f: 784, t: 0.24, d: 0.12 },
      { f: 1047, t: 0.36, d: 0.18 },
      { f: 784, t: 0.56, d: 0.12 },
      { f: 1047, t: 0.68, d: 0.4 },
    ];
    notes.forEach(n => tone(n.f, n.d, 'triangle', 0.18, n.t));
    // Add a low bass thump
    tone(110, 0.6, 'sine', 0.2, 0);
    tone(165, 0.6, 'sine', 0.15, 0.36);
  }

  // Beep (timer warning at 5s)
  function timerWarning() {
    tone(660, 0.08, 'square', 0.12);
  }

  // Final countdown beep
  function countdownBeep() {
    tone(440, 0.06, 'square', 0.15);
  }

  // Achievement unlocked
  function achievement() {
    tone(880, 0.08, 'triangle', 0.14, 0);
    tone(1108, 0.08, 'triangle', 0.14, 0.06);
    tone(1318, 0.18, 'triangle', 0.16, 0.12);
  }

  function setEnabled(v) { enabled = v; }
  function isEnabled() { return enabled; }

  return {
    tick, whoosh, ding, tap, starPop, scoreUp,
    roundComplete, victory, timerWarning, countdownBeep, achievement,
    setEnabled, isEnabled, ensureCtx,
  };
})();
