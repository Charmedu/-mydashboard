export function playPop() {
  if (typeof window === 'undefined') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
    setTimeout(() => ctx.close(), 400);
  } catch {
    // AudioContext unavailable or blocked
  }
}

export function spawnConfetti(origin?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#6366f1', '#f97316', '#ec4899', '#3b82f6', '#a855f7', '#facc15'];
  const rect = origin?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
  const count = 22;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const color = colors[i % colors.length];
    const size = 5 + Math.random() * 7;
    const angle = (360 / count) * i + (Math.random() * 25 - 12);
    const dist = 50 + Math.random() * 70;
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;
    const rot = Math.random() * 720 - 360;
    const circle = Math.random() > 0.45;

    el.style.cssText = `
      position:fixed;
      left:${cx}px;
      top:${cy}px;
      width:${size}px;
      height:${circle ? size : size * 0.38}px;
      background:${color};
      border-radius:${circle ? '50%' : '1px'};
      pointer-events:none;
      z-index:9999;
      animation:confetti-burst 0.75s ease-out forwards;
    `;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.setProperty('--rot', `${rot}deg`);

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }
}

export function celebrate(origin?: HTMLElement | null) {
  playPop();
  spawnConfetti(origin);
}
