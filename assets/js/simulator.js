/* In-browser simulator for the dimensional SIQR–IBR model (RK4 integration). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);

  const NAMES = ["S₁", "I₁", "Q₁", "R₁", "I₂", "B₂", "R₂"];
  const VARS = ["--c-s", "--c-i", "--c-q", "--c-r", "--c-i2", "--c-b", "--c-r2"];
  const DASHED = [false, false, false, false, true, true, true];

  // Parameter sets C and D from Table 3.1 of the report (dimensional model)
  const BASE_D = { b: 75, d1: 0.3, beta1: 2.5, beta2: 0.6, mu: 0.3, lam: 0.8, d4: 2.5, b1: 75,
                   d3: 2, eta: 0.4, eta1: 7.5, alpha: 1, d2: 0.4, gamma: 0.75, delta: 0.9,
                   theta: 10, m1: 2, m2: 2 };
  const PRESETS = {
    C:  { p: { ...BASE_D, b: 1, beta1: 0.5, d4: 10, eta1: 17.5, delta: 1.9, m1: 6, m2: 6 },
          y0: [20, 20, 15, 10, 10, 20, 10] },
    D:  { p: { ...BASE_D }, y0: [50, 55, 40, 25, 10, 20, 25] },
    D0: { p: { ...BASE_D, m1: 0, m2: 0 }, y0: [20, 1, 10, 20, 50, 20, 75] }
  };

  const SLIDERS = [
    { group: "Target side" },
    { k: "beta1", label: "β₁", min: 0, max: 5, step: 0.05 },
    { k: "beta2", label: "β₂", min: 0, max: 3, step: 0.05 },
    { k: "d2", label: "d₂", min: 0.05, max: 2, step: 0.05 },
    { k: "mu", label: "μ", min: 0, max: 2, step: 0.05 },
    { k: "eta", label: "η", min: 0, max: 2, step: 0.05 },
    { k: "lam", label: "λ₀", min: 0, max: 2, step: 0.05 },
    { group: "Control coefficients" },
    { k: "m1", label: "m₁", min: 0, max: 10, step: 0.5 },
    { k: "m2", label: "m₂", min: 0, max: 10, step: 0.5 },
    { group: "Attacker side" },
    { k: "delta", label: "δ", min: 0, max: 5, step: 0.05 },
    { k: "gamma", label: "γ", min: 0, max: 3, step: 0.05 }
  ];

  let P = { ...PRESETS.D.p };
  let Y0 = PRESETS.D.y0.slice();
  const visible = NAMES.map(() => true);
  let traj = null, hoverX = null;

  /* ---------- model ---------- */
  function rhs(y, p) {
    const [S1, I1, Q1, R1, I2, B2, R2] = y;
    const N1 = S1 + I1 + Q1 + R1 || 1e-12;
    const N2 = I2 + B2 + R2 || 1e-12;
    const inf = p.beta1 * Math.exp(-p.m1 * I1 / N1) * S1 * I1 / N1
              + p.beta2 * Math.exp(-p.m2 * B2 / N2) * S1 * B2 / N2;
    return [
      p.b - p.d1 * S1 + p.alpha * R1 - inf,
      inf - (p.d2 + p.mu + p.eta) * I1,
      p.mu * I1 - (p.d2 + p.lam) * Q1,
      p.eta * I1 + p.lam * Q1 - (p.alpha + p.d1) * R1,
      p.b1 - (p.d4 + p.delta + p.eta1) * I2 + p.theta * R2,
      p.delta * I2 - (p.d4 + p.gamma) * B2,
      p.gamma * B2 + p.eta1 * I2 - (p.d3 + p.theta) * R2
    ];
  }
  function integrate(p, y0, T, n = 3000) {
    const h = T / n, t = [0], ys = [y0.slice()];
    let y = y0.slice();
    const add = (a, k, s) => a.map((v, i) => v + s * k[i]);
    for (let i = 0; i < n; i++) {
      const k1 = rhs(y, p), k2 = rhs(add(y, k1, h / 2), p),
            k3 = rhs(add(y, k2, h / 2), p), k4 = rhs(add(y, k3, h), p);
      y = y.map((v, j) => Math.max(0, v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])));
      t.push((i + 1) * h); ys.push(y);
    }
    return { t, ys };
  }
  const R0 = p => p.beta1 / (p.d2 + p.mu + p.eta);

  /* ---------- controls ---------- */
  const sliderBox = $("#sliders");
  function buildSliders() {
    sliderBox.innerHTML = SLIDERS.map(s => s.group
      ? `<div class="slider-group">${s.group}</div>`
      : `<div class="sim-row"><label class="ctl-lbl" for="sl-${s.k}">${s.label}</label>
         <input type="range" id="sl-${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${P[s.k]}">
         <output id="out-${s.k}">${(+P[s.k]).toFixed(2)}</output></div>`).join("");
    SLIDERS.filter(s => s.k).forEach(s => {
      document.getElementById("sl-" + s.k).addEventListener("input", e => {
        P[s.k] = +e.target.value;
        document.getElementById("out-" + s.k).textContent = P[s.k].toFixed(2);
        schedule();
      });
    });
  }
  function syncSliders() {
    SLIDERS.filter(s => s.k).forEach(s => {
      document.getElementById("sl-" + s.k).value = P[s.k];
      document.getElementById("out-" + s.k).textContent = (+P[s.k]).toFixed(2);
    });
  }
  document.querySelectorAll("[data-preset]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("[data-preset]").forEach(b => b.classList.toggle("active", b === btn));
    const pr = PRESETS[btn.dataset.preset];
    P = { ...pr.p }; Y0 = pr.y0.slice();
    syncSliders(); schedule();
  }));
  $("#tmax").addEventListener("input", e => { $("#tmaxOut").textContent = e.target.value; schedule(); });
  $("#logScale").addEventListener("change", draw);

  function buildLegend() {
    const css = getComputedStyle(document.documentElement);
    $("#legend").innerHTML = NAMES.map((n, i) => {
      const c = css.getPropertyValue(VARS[i]).trim();
      return `<button data-i="${i}" class="${visible[i] ? "" : "off"}" style="color:${c}">
        <i class="${DASHED[i] ? "dash" : ""}" style="background:${c}"></i><span style="color:var(--ink)">${n}</span></button>`;
    }).join("");
    document.querySelectorAll("#legend button").forEach(b => b.addEventListener("click", () => {
      const i = +b.dataset.i; visible[i] = !visible[i];
      b.classList.toggle("off", !visible[i]); draw();
    }));
  }

  /* ---------- run ---------- */
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; run(); });
  }
  function run() {
    traj = integrate(P, Y0, +$("#tmax").value);
    const r = R0(P), box = $("#r0Box");
    $("#r0Val").textContent = r.toFixed(3);
    box.classList.toggle("ok", r < 1);
    box.classList.toggle("bad", r >= 1);
    $("#r0Verdict").textContent = r < 1
      ? "Code-free equilibrium E₁ is stable"
      : "Endemic equilibrium E₂ — code persists";
    const last = traj.ys[traj.ys.length - 1];
    $("#ssTable").innerHTML = NAMES.map((n, i) =>
      `<div class="ss-cell"><b style="color:var(${VARS[i]})">${n}</b><span>${fmtN(last[i])}</span></div>`).join("");
    draw();
  }
  const fmtN = v => v >= 100 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v >= 0.001 ? v.toFixed(3) : v.toExponential(1);

  /* ---------- canvas plot ---------- */
  const canvas = $("#simCanvas"), ctx = canvas.getContext("2d");
  const PAD = { l: 52, r: 16, t: 14, b: 38 };

  function niceTicks(lo, hi, n = 5) {
    const span = hi - lo || 1, step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toPrecision(10));
    return out;
  }

  function draw() {
    if (!traj) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink-2").trim(), line = css.getPropertyValue("--line").trim(),
          muted = css.getPropertyValue("--muted").trim(), surface = css.getPropertyValue("--surface").trim();
    const log = $("#logScale").checked;
    const { t, ys } = traj, T = t[t.length - 1];

    let ymax = 0, ymin = Infinity;
    ys.forEach(y => y.forEach((v, i) => { if (visible[i]) { ymax = Math.max(ymax, v); ymin = Math.min(ymin, v); } }));
    if (!isFinite(ymin)) { ymin = 0; ymax = 1; }
    const tf = log ? v => Math.log10(Math.max(v, 1e-3)) : v => v;
    let lo = log ? Math.floor(tf(Math.max(ymin, 1e-3))) : 0;
    let hi = log ? Math.ceil(tf(ymax || 1)) : (ymax || 1) * 1.05;
    if (hi <= lo) hi = lo + 1;

    const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
    const X = v => PAD.l + (v / T) * pw;
    const Y = v => PAD.t + ph - ((tf(v) - lo) / (hi - lo)) * ph;

    // grid + axes
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = muted; ctx.strokeStyle = line; ctx.lineWidth = 1;
    const yt = log ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : niceTicks(lo, hi);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach(v => {
      const py = log ? PAD.t + ph - ((v - lo) / (hi - lo)) * ph : Y(v);
      ctx.beginPath(); ctx.moveTo(PAD.l, py); ctx.lineTo(W - PAD.r, py); ctx.stroke();
      ctx.fillText(log ? (10 ** v >= 1 ? String(10 ** v) : (10 ** v).toPrecision(1)) : String(v), PAD.l - 8, py);
    });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    niceTicks(0, T, 6).forEach(v => {
      const px = X(v);
      ctx.beginPath(); ctx.moveTo(px, PAD.t + ph); ctx.lineTo(px, PAD.t + ph + 4); ctx.stroke();
      ctx.fillText(String(v), px, PAD.t + ph + 7);
    });
    ctx.strokeStyle = ink;
    ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t); ctx.lineTo(PAD.l, PAD.t + ph); ctx.lineTo(W - PAD.r, PAD.t + ph); ctx.stroke();
    ctx.fillStyle = muted;
    ctx.fillText("Time", PAD.l + pw / 2, H - 16);
    ctx.save(); ctx.translate(13, PAD.t + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("Node density", 0, 0); ctx.restore();

    // series
    const stride = Math.max(1, Math.floor(t.length / (pw * 1.5)));
    NAMES.forEach((_, i) => {
      if (!visible[i]) return;
      ctx.strokeStyle = css.getPropertyValue(VARS[i]).trim();
      ctx.lineWidth = 2;
      ctx.setLineDash(DASHED[i] ? [7, 5] : []);
      ctx.beginPath();
      for (let k = 0; k < t.length; k += stride) {
        const px = X(t[k]), py = Y(ys[k][i]);
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // hover crosshair
    if (hoverX !== null && hoverX >= PAD.l && hoverX <= W - PAD.r) {
      const tt = ((hoverX - PAD.l) / pw) * T;
      const k = Math.min(t.length - 1, Math.round((tt / T) * (t.length - 1)));
      ctx.strokeStyle = muted; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hoverX, PAD.t); ctx.lineTo(hoverX, PAD.t + ph); ctx.stroke();
      ctx.setLineDash([]);
      const rows = NAMES.map((n, i) => [n, ys[k][i], i]).filter(r => visible[r[2]]);
      const bw = 108, bh = 20 + rows.length * 17;
      let bx = hoverX + 12; if (bx + bw > W - PAD.r) bx = hoverX - bw - 12;
      ctx.fillStyle = surface; ctx.strokeStyle = line;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, PAD.t + 6, bw, bh, 8) : ctx.rect(bx, PAD.t + 6, bw, bh);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.font = "12px JetBrains Mono, monospace";
      ctx.fillStyle = muted; ctx.fillText("t = " + t[k].toFixed(1), bx + 10, PAD.t + 12);
      rows.forEach(([n, v, i], j) => {
        ctx.fillStyle = css.getPropertyValue(VARS[i]).trim();
        ctx.fillText(n, bx + 10, PAD.t + 30 + j * 17);
        ctx.fillStyle = ink;
        ctx.textAlign = "right"; ctx.fillText(fmtN(v), bx + bw - 10, PAD.t + 30 + j * 17); ctx.textAlign = "left";
      });
    }
  }

  canvas.addEventListener("mousemove", e => { hoverX = e.offsetX; draw(); });
  canvas.addEventListener("mouseleave", () => { hoverX = null; draw(); });
  canvas.addEventListener("touchmove", e => {
    const r = canvas.getBoundingClientRect(); hoverX = e.touches[0].clientX - r.left; draw();
  }, { passive: true });
  window.addEventListener("resize", draw);
  document.addEventListener("themechange", () => { buildLegend(); run(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { buildLegend(); run(); });

  buildSliders();
  buildLegend();
  run();
})();
