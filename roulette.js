/* =========================================================
   roulette.js — Canvas roulette wheel with smooth deceleration
   ========================================================= */

const Roulette = (function () {

  const canvas = document.getElementById('roulette-canvas');
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;

  let segments = [];      // [{ name, color }]
  let rotation = 0;       // current rotation in radians
  let spinning = false;
  let targetIndex = 0;
  let onDoneCb = null;
  let lastTickAngle = 0;

  // Build the segments list from a list of player names
  function setPlayers(names) {
    const palette = [
      '#e11d2e', '#fbbf24', '#3b82f6', '#10b981',
      '#a855f7', '#ec4899', '#14b8a6', '#f97316',
      '#84cc16', '#06b6d4', '#8b5cf6', '#ef4444',
    ];
    segments = names.map((name, i) => ({
      name,
      color: palette[i % palette.length],
    }));
    draw();
  }

  // The pointer is at the top (12 o'clock = angle -PI/2 in canvas coords).
  // Segment i is drawn from `i*segAngle + rot - PI/2` going clockwise.
  // Segment i's CENTER angle = `(i + 0.5) * segAngle + rot - PI/2`.
  // For the center to be at the pointer (-PI/2): `(i + 0.5) * segAngle + rot ≡ 0 (mod 2π)`.
  // So the segment under the pointer is the one whose center is closest to -PI/2.
  function getSegmentAtPointer(rot) {
    if (segments.length === 0) return 0;
    const segAngle = (Math.PI * 2) / segments.length;
    // i ≈ -rot/segAngle - 0.5 (mod N)
    let i = Math.round(-rot / segAngle - 0.5);
    i = ((i % segments.length) + segments.length) % segments.length;
    return i;
  }

  // Easing for deceleration
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

  // Spin to a target player index — guaranteed to land on that segment.
  function spinTo(targetIdx, cb) {
    if (spinning || segments.length === 0) return;
    spinning = true;
    targetIndex = targetIdx;
    onDoneCb = cb;
    wrap.classList.add('spinning');

    Audio.whoosh();

    const segAngle = (Math.PI * 2) / segments.length;

    // Final rotation that puts targetIdx's CENTER at the pointer:
    // (targetIdx + 0.5) * segAngle + finalRot ≡ 0 (mod 2π)
    // → finalRot ≡ -(targetIdx + 0.5) * segAngle (mod 2π)
    const targetRot = -(targetIdx + 0.5) * segAngle;

    // Minimal positive delta from current rotation to targetRot (mod 2π)
    const startRot = rotation;
    let delta = (targetRot - startRot) % (Math.PI * 2);
    if (delta < 0) delta += Math.PI * 2;

    // Add 5–7 full rotations for drama
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    // Small jitter inside the segment so it doesn't land dead-center every time
    const jitter = (Math.random() - 0.5) * segAngle * 0.5;
    const totalDelta = fullRotations * Math.PI * 2 + delta + jitter;

    const duration = 4200 + Math.random() * 800; // 4.2 - 5.0s
    const startTime = performance.now();
    lastTickAngle = startRot;

    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutQuint(t);
      rotation = startRot + totalDelta * eased;
      draw();

      // Tick sounds as we pass segment boundaries
      const segAngleStep = (Math.PI * 2) / segments.length;
      const angleDiff = rotation - lastTickAngle;
      if (angleDiff >= segAngleStep) {
        const ticks = Math.floor(angleDiff / segAngleStep);
        // Only play one tick per frame to avoid stutter
        Audio.tick();
        lastTickAngle += ticks * segAngleStep;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        wrap.classList.remove('spinning');
        Audio.ding();
        // Small haptic
        if (navigator.vibrate) navigator.vibrate(60);
        // Verify landing
        const landedOn = getSegmentAtPointer(rotation);
        // Safety: if we somehow landed on the wrong segment (shouldn't happen),
        // still call the callback with the visually-landed index.
        const finalIdx = (landedOn === targetIdx) ? targetIdx : landedOn;
        // Reveal pause
        setTimeout(() => {
          if (onDoneCb) onDoneCb(finalIdx);
        }, 700);
      }
    }
    requestAnimationFrame(frame);
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 6;

    ctx.clearRect(0, 0, w, h);

    if (segments.length === 0) return;

    const segAngle = (Math.PI * 2) / segments.length;

    // Outer ring (bezel)
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1f';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3a3a44';
    ctx.stroke();

    // Inner glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225, 29, 46, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Segments
    for (let i = 0; i < segments.length; i++) {
      const a0 = i * segAngle + rotation - Math.PI / 2;
      const a1 = a0 + segAngle;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius - 4, a0, a1);
      ctx.closePath();

      // Gradient fill
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
      const c = segments[i].color;
      grad.addColorStop(0, c);
      grad.addColorStop(1, shade(c, -25));
      ctx.fillStyle = grad;
      ctx.fill();

      // Divider
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0 + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(14, Math.min(28, 240 / segments.length));
      ctx.font = `700 ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      // Truncate long names
      const maxLen = Math.max(6, Math.floor(14 - segments.length / 2));
      const label = segments[i].name.length > maxLen
        ? segments[i].name.slice(0, maxLen) + '…'
        : segments[i].name;
      ctx.fillText(label, radius - 14, 0);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d2e';
    ctx.fill();
  }

  // Hex shade helper (positive = lighten, negative = darken)
  function shade(hex, percent) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (percent / 100) * 255)));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
  }

  function isSpinning() { return spinning; }

  return { setPlayers, spinTo, isSpinning, draw };
})();
