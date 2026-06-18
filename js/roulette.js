/* =========================================================
   roulette.js — Canvas roulette wheel
   - High-DPI rendering for crisp text (no more blur)
   - Smooth deceleration with guaranteed landing
   ========================================================= */

const Roulette = (function () {

  const canvas = document.getElementById('roulette-canvas');
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;

  let segments = [];
  let rotation = 0;
  let spinning = false;
  let onDoneCb = null;
  let lastTickAngle = 0;
  let dpr = 1;

  // High-DPI sizing: set canvas backing store to actual pixels
  function resizeCanvas() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(1, Math.min(rect.width, rect.height));
    if (size <= 0) return;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    // Scale the context so we can draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // Watch for size changes
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }
  // Also observe parent (initial layout)
  if (window.ResizeObserver && wrap) {
    new ResizeObserver(() => resizeCanvas()).observe(wrap);
  }

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
    resizeCanvas();
    draw();
  }

  function getSegmentAtPointer(rot) {
    if (segments.length === 0) return 0;
    const segAngle = (Math.PI * 2) / segments.length;
    let i = Math.round(-rot / segAngle - 0.5);
    i = ((i % segments.length) + segments.length) % segments.length;
    return i;
  }

  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

  function spinTo(targetIdx, cb) {
    if (spinning || segments.length === 0) return;
    spinning = true;
    onDoneCb = cb;
    wrap.classList.add('spinning');
    if (wrap.parentElement) wrap.parentElement.classList.add('is-spinning');

    Audio.whoosh();

    const segAngle = (Math.PI * 2) / segments.length;
    const targetRot = -(targetIdx + 0.5) * segAngle;
    const startRot = rotation;
    let delta = (targetRot - startRot) % (Math.PI * 2);
    if (delta < 0) delta += Math.PI * 2;
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const jitter = (Math.random() - 0.5) * segAngle * 0.5;
    const totalDelta = fullRotations * Math.PI * 2 + delta + jitter;

    const duration = 4200 + Math.random() * 800;
    const startTime = performance.now();
    lastTickAngle = startRot;

    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutQuint(t);
      rotation = startRot + totalDelta * eased;
      draw();

      const segAngleStep = (Math.PI * 2) / segments.length;
      const angleDiff = rotation - lastTickAngle;
      if (angleDiff >= segAngleStep) {
        const ticks = Math.floor(angleDiff / segAngleStep);
        Audio.tick();
        lastTickAngle += ticks * segAngleStep;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        wrap.classList.remove('spinning');
        if (wrap.parentElement) wrap.parentElement.classList.remove('is-spinning');
        Audio.ding();
        if (navigator.vibrate) navigator.vibrate(60);
        const finalIdx = getSegmentAtPointer(rotation);
        setTimeout(() => {
          if (onDoneCb) onDoneCb(finalIdx);
        }, 700);
      }
    }
    requestAnimationFrame(frame);
  }

  function draw() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    if (w <= 0 || h <= 0) return;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.max(20, Math.min(cx, cy) - 4);

    ctx.clearRect(0, 0, w, h);

    if (segments.length === 0) return;

    const segAngle = (Math.PI * 2) / segments.length;

    // Outer ring (bezel)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1f';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a3a44';
    ctx.stroke();

    const innerRadius = radius - 6;

    // Segments
    for (let i = 0; i < segments.length; i++) {
      const a0 = i * segAngle + rotation - Math.PI / 2;
      const a1 = a0 + segAngle;

      // Segment fill with radial gradient
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerRadius, a0, a1);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, innerRadius * 0.3, cx, cy, innerRadius);
      const c = segments[i].color;
      grad.addColorStop(0, c);
      grad.addColorStop(1, shade(c, -28));
      ctx.fillStyle = grad;
      ctx.fill();

      // Divider
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0 + segAngle / 2);

      // Font size scales with segment count — but stay legible (min 13px)
      const fontSize = Math.max(13, Math.min(22, (innerRadius * 0.13) - segments.length * 0.4));
      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Truncate long names to fit
      const maxChars = Math.max(5, Math.floor(innerRadius / (fontSize * 0.62)));
      let label = segments[i].name;
      if (label.length > maxChars) {
        label = label.slice(0, maxChars - 1) + '…';
      }

      // Shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#fff';
      ctx.fillText(label, innerRadius - 12, 0);
      ctx.restore();
    }

    // Center hub
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d2e';
    ctx.fill();
  }

  function shade(hex, percent) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (percent / 100) * 255)));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
  }

  function isSpinning() { return spinning; }

  // Initial size — wait for next frame so layout is ready
  setTimeout(resizeCanvas, 0);

  return { setPlayers, spinTo, isSpinning, draw, resizeCanvas };
})();
